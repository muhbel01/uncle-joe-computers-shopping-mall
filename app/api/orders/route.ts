import { NextResponse } from "next/server";
import { checkoutRequestSchema } from "@/lib/checkout-schema";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const genericFailure = "We couldn't place your order. Please review your details and try again.";
const MAX_CHECKOUT_BODY_BYTES = 64 * 1024;

type LimitedBodyResult =
  | { tooLarge: true }
  | { tooLarge: false; text: string };

async function readLimitedBody(request: Request): Promise<LimitedBodyResult> {
  const reader = request.body?.getReader();
  if (!reader) return { tooLarge: false, text: "" };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_CHECKOUT_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return { tooLarge: true };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { tooLarge: false, text: new TextDecoder().decode(bytes) };
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return NextResponse.json({ error: "Submit checkout details using JSON." }, { status: 415 });
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CHECKOUT_BODY_BYTES) {
    return NextResponse.json({ error: "Your checkout request is too large. Please reduce the cart and try again." }, { status: 413 });
  }

  let body: unknown;

  try {
    const result = await readLimitedBody(request);
    if (result.tooLarge) {
      return NextResponse.json({ error: "Your checkout request is too large. Please reduce the cart and try again." }, { status: 413 });
    }
    body = JSON.parse(result.text);
  } catch {
    return NextResponse.json({ error: "Please submit valid checkout details." }, { status: 400 });
  }

  const parsed = checkoutRequestSchema.safeParse(body);
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

      if (error.code === "P0001" || error.code === "P0002") {
        return NextResponse.json({
          error: "A product in your cart is unavailable or no longer has enough stock. Please return to your cart and review it.",
        }, { status: 409 });
      }

      if (error.code === "22023") {
        return NextResponse.json({ error: "Please check your checkout details and try again." }, { status: 400 });
      }

      if (error.code === "55000") {
        return NextResponse.json({
          error: "Online checkout is not enabled for this store yet. Please contact the store before placing an order.",
        }, { status: 503 });
      }

      return NextResponse.json({ error: genericFailure }, { status: 500 });
    }

    const order = Array.isArray(data) ? data[0] : data;
    if (!order?.order_id || !order?.order_number || order?.order_total == null) {
      console.error("Guest checkout returned an unexpected response", {
        requestKey: parsed.data.requestKey,
      });
      return NextResponse.json({ error: genericFailure }, { status: 500 });
    }

    return NextResponse.json({
      order: {
        id: order.order_id,
        number: order.order_number,
        total: Number(order.order_total),
        currency: order.currency ?? "NGN",
        paymentStatus: "unpaid",
        fulfilmentMethod: parsed.data.fulfilmentMethod,
      },
      message: "Your order has been created. Payment has not been taken.",
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: genericFailure }, { status: 500 });
  }
}
