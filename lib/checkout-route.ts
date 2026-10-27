import { checkoutRequestSchema, type CheckoutRequest } from "./checkout-schema";
import { readCheckoutJson } from "./checkout-http";
import { checkoutRpcErrorResponse, checkoutSuccessResponse } from "./checkout-api";
import { checkCheckoutRateLimit, type CheckoutRateLimitResult } from "./checkout-rate-limit";

type RpcError = { code?: string } | null;

export type CheckoutRouteDependencies = {
  createClient: () => Promise<{
    rpc: (name: string, args: { p_payload: CheckoutRequest }) => PromiseLike<{
      data: unknown;
      error: RpcError;
    }>;
  }>;
  logError?: (message: string, details: Record<string, unknown>) => void;
  rateLimit?: (request: Request) => Promise<CheckoutRateLimitResult>;
};

const genericFailure = "We couldn't place your order. Please review your details and try again.";

export function createCheckoutPostHandler(dependencies: CheckoutRouteDependencies) {
  const logError = dependencies.logError ?? ((message, details) => console.error(message, details));
  const rateLimit = dependencies.rateLimit ?? checkCheckoutRateLimit;

  return async function POST(request: Request): Promise<Response> {
    const limit = await rateLimit(request);
    if (!limit.allowed) {
      if ("unavailable" in limit && limit.unavailable) {
        return Response.json({ error: "Checkout is temporarily unavailable. Please try again later." }, { status: 503 });
      }
      const retryAfter = "retryAfterSeconds" in limit ? limit.retryAfterSeconds : 60;
      return Response.json(
        { error: "Too many checkout attempts. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    const readResult = await readCheckoutJson(request);
    if (!readResult.ok) {
      return Response.json({ error: readResult.error }, { status: readResult.status });
    }

    const parsed = checkoutRequestSchema.safeParse(readResult.body);
    if (!parsed.success) {
      return Response.json({
        error: "Some checkout details need attention.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    try {
      const supabase = await dependencies.createClient();
      const { data, error } = await supabase.rpc("create_guest_order", {
        p_payload: parsed.data,
      });

      if (error) {
        logError("Guest checkout RPC failed", {
          code: error.code,
          requestKey: parsed.data.requestKey,
        });
        const mapped = checkoutRpcErrorResponse(error.code ?? "");
        return Response.json(mapped.body, { status: mapped.status });
      }

      const order = Array.isArray(data) ? data[0] : data;
      const response = checkoutSuccessResponse(
        order as Parameters<typeof checkoutSuccessResponse>[0],
        parsed.data.fulfilmentMethod,
      );
      if (!response) {
        logError("Guest checkout returned an unexpected response", {
          requestKey: parsed.data.requestKey,
        });
        return Response.json({ error: genericFailure }, { status: 500 });
      }

      return Response.json(response, { status: 201 });
    } catch {
      return Response.json({ error: genericFailure }, { status: 500 });
    }
  };
}
