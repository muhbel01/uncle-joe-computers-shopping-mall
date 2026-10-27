export type CheckoutApiErrorResponse = {
  status: 400 | 409 | 503 | 500;
  body: { error: string };
};

const genericFailure = "We couldn't place your order. Please review your details and try again.";

export function checkoutRpcErrorResponse(code: string): CheckoutApiErrorResponse {
  if (code === "P0001" || code === "P0002") {
    return {
      status: 409,
      body: { error: "A product in your cart is unavailable or no longer has enough stock. Please return to your cart and review it." },
    };
  }

  if (code === "22023") {
    return { status: 400, body: { error: "Please check your checkout details and try again." } };
  }

  if (code === "55000") {
    return {
      status: 503,
      body: { error: "Online checkout is not enabled for this store yet. Please contact the store before placing an order." },
    };
  }

  return { status: 500, body: { error: genericFailure } };
}

type CheckoutOrder = {
  order_id?: string | null;
  order_number?: string | null;
  order_total?: string | number | null;
  currency?: string | null;
} | null | undefined;

export function checkoutSuccessResponse(
  order: CheckoutOrder,
  fulfilmentMethod: "delivery" | "pickup",
) {
  if (!order?.order_id || !order.order_number || order.order_total == null) return null;
  const total = Number(order.order_total);
  if (!Number.isFinite(total) || total < 0) return null;

  return {
    order: {
      id: order.order_id,
      number: order.order_number,
      total,
      currency: order.currency ?? "NGN",
      paymentStatus: "unpaid" as const,
      fulfilmentMethod,
    },
    message: "Your order has been created. Payment has not been taken.",
  };
}
