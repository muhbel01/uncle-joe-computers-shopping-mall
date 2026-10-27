"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { storeConfig } from "@/lib/store-config";

const money = new Intl.NumberFormat(storeConfig.language, {
  style: "currency",
  currency: storeConfig.currency,
  maximumFractionDigits: 0,
});

type CreatedOrder = {
  id: string;
  number: string;
  total: number;
  currency: string;
  paymentStatus: "unpaid";
  fulfilmentMethod: "delivery" | "pickup";
};

export default function CheckoutPage() {
  const { items, hydrated, itemCount, subtotal, clearCart } = useCart();
  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">("delivery");
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", address: "", city: "", state: "", notes: "" });
  const [requestKey, setRequestKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [order, setOrder] = useState<CreatedOrder | null>(null);

  function update(field: keyof typeof customer, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
    setRequestKey("");
    setErrorMessage("");
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    // Keep the same key on retries so a network timeout cannot create duplicate orders.
    const activeRequestKey = requestKey || crypto.randomUUID();
    setRequestKey(activeRequestKey);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKey: activeRequestKey,
          customer: { name: customer.name, phone: customer.phone, email: customer.email },
          fulfilmentMethod: fulfilment,
          deliveryAddress: {
            address: fulfilment === "delivery" ? customer.address : "",
            city: fulfilment === "delivery" ? customer.city : "",
            state: fulfilment === "delivery" ? customer.state : "",
          },
          customerNote: customer.notes,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(typeof result.error === "string"
          ? result.error
          : "We couldn't place your order. Please review your details and try again.");
        return;
      }

      if (!result.order?.id || !result.order?.number || typeof result.order?.total !== "number") {
        setErrorMessage("The store returned an unexpected response. Please contact the store before retrying.");
        return;
      }

      setOrder(result.order as CreatedOrder);
      clearCart();
    } catch {
      setErrorMessage("We couldn't reach the store. Your request may not have completed. Retry without changing your details to avoid a duplicate order.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return <main className="page-shell"><div className="container page-heading"><h1>Checkout</h1><p>Loading your cart…</p></div></main>;
  }

  if (order) {
    return (
      <main className="page-shell">
        <div className="container page-heading">
          <span className="eyebrow">{storeConfig.shortName}</span>
          <h1>Order received</h1>
          <p>Your order has been recorded, but payment has not been taken.</p>
          <section className="checkout-review" aria-live="polite">
            <h2>Order {order.number}</h2>
            <p><strong>Total:</strong> {new Intl.NumberFormat(storeConfig.language, { style: "currency", currency: order.currency || storeConfig.currency, maximumFractionDigits: 0 }).format(order.total)}</p>
            <p><strong>Payment:</strong> Not paid</p>
            <p>The store must confirm payment and fulfilment arrangements separately. Do not treat this as a paid order.</p>
          </section>
          <Link className="button primary" href="/products">Continue shopping</Link>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return <main className="page-shell"><div className="container page-heading"><h1>Your cart is empty</h1><p>Add products before starting checkout.</p><Link className="button primary" href="/products">Browse products</Link></div></main>;
  }

  if (!storeConfig.checkoutEnabled) {
    return (
      <main className="page-shell">
        <div className="container page-heading">
          <Link href="/cart" className="back-link">← Back to cart</Link>
          <span className="eyebrow">{storeConfig.shortName}</span>
          <h1>Checkout is not open yet</h1>
          <p>This store is still preparing online order requests. Your cart is saved in this browser; no personal details have been submitted and no order has been created.</p>
          <section className="checkout-review">
            <h2>Your cart summary</h2>
            <p><strong>{itemCount}</strong> {itemCount === 1 ? "item" : "items"} · estimated subtotal <strong>{money.format(subtotal)}</strong></p>
            <p>Prices and availability are estimates until the store confirms its catalogue and checkout settings.</p>
          </section>
          <div className="hero-actions">
            <Link className="button primary" href="/cart">Review cart</Link>
            <Link className="button secondary" href="/products">Continue shopping</Link>
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="page-shell">
      <div className="container page-heading">
        <Link href="/cart" className="back-link">← Back to cart</Link>
        <span className="eyebrow">{storeConfig.shortName}</span>
        <h1>Checkout details</h1>
        <p>Submit your details to request an order. Prices and availability are checked by the store database.</p>
      </div>
      <div className="container checkout-layout">
        <form className="checkout-form" onSubmit={submitOrder}>
          <section className="checkout-section">
            <h2>Contact details</h2>
            <label>Full name<input autoComplete="name" required minLength={2} maxLength={120} value={customer.name} onChange={(e) => update("name", e.target.value)} /></label>
            <label>Phone number<input autoComplete="tel" type="tel" required minLength={7} maxLength={30} value={customer.phone} onChange={(e) => update("phone", e.target.value)} placeholder="e.g. 08012345678" /></label>
            <label>Email address <span>(optional)</span><input autoComplete="email" type="email" maxLength={254} value={customer.email} onChange={(e) => update("email", e.target.value)} /></label>
          </section>
          <section className="checkout-section">
            <h2>How would you like to receive your order?</h2>
            <div className="fulfilment-options">
              <label><input type="radio" name="fulfilment" checked={fulfilment === "delivery"} onChange={() => { setFulfilment("delivery"); setRequestKey(""); setErrorMessage(""); }} /> Delivery</label>
              <label><input type="radio" name="fulfilment" checked={fulfilment === "pickup"} onChange={() => { setFulfilment("pickup"); setRequestKey(""); setErrorMessage(""); }} /> Pick up in store</label>
            </div>
            {fulfilment === "delivery" ? (
              <div className="checkout-fields">
                <label>Delivery address<input autoComplete="street-address" required maxLength={240} value={customer.address} onChange={(e) => update("address", e.target.value)} /></label>
                <label>City / town<input autoComplete="address-level2" required maxLength={100} value={customer.city} onChange={(e) => update("city", e.target.value)} /></label>
                <label>State<input autoComplete="address-level1" required maxLength={100} value={customer.state} onChange={(e) => update("state", e.target.value)} /></label>
              </div>
            ) : <p className="checkout-note">Pickup is subject to the store&apos;s checkout settings and confirmation.</p>}
            <label>Order notes <span>(optional)</span><textarea rows={3} maxLength={1000} value={customer.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Delivery instructions or product questions" /></label>
          </section>
          <div className="checkout-safety-note"><strong>Payment is not enabled here</strong><p>Submitting can create an unpaid order only when the store&apos;s database has checkout enabled. No online payment is taken by this form.</p></div>
          {errorMessage && <div className="checkout-safety-note" role="alert"><strong>Order not confirmed</strong><p>{errorMessage}</p></div>}
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? "Submitting order…" : "Submit order request"}
          </button>
        </form>
        <aside className="cart-summary">
          <h2>Order summary</h2>
          {items.map((item) => <div key={item.productId}><span>{item.name} × {item.quantity}</span><strong>{money.format(item.price * item.quantity)}</strong></div>)}
          <div className="cart-summary-total"><span>Browser subtotal (estimate)</span><strong>{money.format(subtotal)}</strong></div>
          <div><span>Delivery</span><small>Confirmed by store settings</small></div>
          <p>The server calculates the final total from database prices. Browser prices are estimates and may differ.</p>
          <Link className="button secondary checkout-back" href="/cart">Edit cart</Link>
          <small>{itemCount} item(s) in this request.</small>
        </aside>
      </div>
    </main>
  );
}
