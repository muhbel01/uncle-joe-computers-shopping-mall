import { NextResponse } from "next/server";
import { checkoutRequestSchema } from "@/lib/checkout-schema";
import { readCheckoutJson } from "@/lib/checkout-http";
import { checkoutRpcErrorResponse, checkoutSuccessResponse } from "@/lib/checkout-api";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const readResult = await readCheckoutJson(request);
  if (!readResult.ok) {
    return NextResponse.json({ error: readResult.error }, { status: readResult.status });
  }

  const parsed = checkoutRequestSchema.safeParse(readResult.body);
  if (!parsed.success) {
    return NextResponse.json({
      error: "Some checkout details need attention.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_guest_order", {
      p_payload: parsed.data,
    });

    if (error) {
      // Do not return database internals or customer data to the browser.
      console.error("Guest checkout RPC failed", {
        code: error.code,
        requestKey: parsed.data.requestKey,
      });
      const mapped = checkoutRpcErrorResponse(error.code);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    const order = Array.isArray(data) ? data[0] : data;
    const response = checkoutSuccessResponse(order, parsed.data.fulfilmentMethod);
    if (!response) {
      console.error("Guest checkout returned an unexpected response", {
        requestKey: parsed.data.requestKey,
      });
      return NextResponse.json({
        error: "We couldn't place your order. Please review your details and try again.",
      }, { status: 500 });
    }

    return NextResponse.json(response, { status: 201 });
  } catch {
    return NextResponse.json({
      error: "We couldn't place your order. Please review your details and try again.",
    }, { status: 500 });
  }
}
