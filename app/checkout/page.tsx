"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { storeConfig } from "@/lib/store-config";

const money = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: storeConfig.currency,
  maximumFractionDigits: 0,
});

export default function CheckoutPage() {
  const { items, hydrated, itemCount, subtotal } = useCart();
  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">("delivery");
  const [reviewed, setReviewed] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", address: "", city: "", state: "", notes: "" });

  function update(field: keyof typeof customer, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
    setReviewed(false);
  }

  function reviewOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReviewed(true);
  }

  if (!hydrated) {
    return <main className="page-shell"><div className="container page-heading"><h1>Checkout</h1><p>Loading your cart…</p></div></main>;
  }

  if (items.length === 0) {
    return <main className="page-shell"><div className="container page-heading"><h1>Your cart is empty</h1><p>Add products before starting checkout.</p><Link className="button primary" href="/products">Browse products</Link></div></main>;
  }

  return (
    <main className="page-shell">
      <div className="container page-heading">
        <Link href="/cart" className="back-link">← Back to cart</Link>
        <span className="eyebrow">{storeConfig.shortName}</span>
        <h1>Checkout details</h1>
        <p>Enter the details needed to prepare your order. This is currently a checkout preview; no order or payment will be submitted.</p>
      </div>
      <div className="container checkout-layout">
        <form className="checkout-form" onSubmit={reviewOrder}>
          <section className="checkout-section">
            <h2>Contact details</h2>
            <label>Full name<input autoComplete="name" required minLength={2} maxLength={120} value={customer.name} onChange={(e) => update("name", e.target.value)} /></label>
            <label>Phone number<input autoComplete="tel" type="tel" required minLength={7} maxLength={30} value={customer.phone} onChange={(e) => update("phone", e.target.value)} placeholder="e.g. 08012345678" /></label>
            <label>Email address <span>(optional)</span><input autoComplete="email" type="email" maxLength={254} value={customer.email} onChange={(e) => update("email", e.target.value)} /></label>
          </section>
          <section className="checkout-section">
            <h2>How would you like to receive your order?</h2>
            <div className="fulfilment-options">
              <label><input type="radio" name="fulfilment" checked={fulfilment === "delivery"} onChange={() => { setFulfilment("delivery"); setReviewed(false); }} /> Delivery</label>
              <label><input type="radio" name="fulfilment" checked={fulfilment === "pickup"} onChange={() => { setFulfilment("pickup"); setReviewed(false); }} /> Pick up in store</label>
            </div>
            {fulfilment === "delivery" ? (
              <div className="checkout-fields">
                <label>Delivery address<input autoComplete="street-address" required maxLength={240} value={customer.address} onChange={(e) => update("address", e.target.value)} /></label>
                <label>City / town<input autoComplete="address-level2" required maxLength={100} value={customer.city} onChange={(e) => update("city", e.target.value)} /></label>
                <label>State<input autoComplete="address-level1" required maxLength={100} value={customer.state} onChange={(e) => update("state", e.target.value)} /></label>
              </div>
            ) : <p className="checkout-note">Pickup location and collection instructions will be confirmed by the store before an order is accepted.</p>}
            <label>Order notes <span>(optional)</span><textarea rows={3} maxLength={1000} value={customer.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Delivery instructions or product questions" /></label>
          </section>
          <div className="checkout-safety-note"><strong>Not live yet</strong><p>Reviewing these details does not send them to the store. Order submission, stock reservation, delivery fees and payment verification must be connected and tested before this can accept orders.</p></div>
          <button className="button primary" type="submit">Review details</button>
          {reviewed && (
            <div className="checkout-review" role="status">
              <h2>Details reviewed</h2>
              <p><strong>{customer.name}</strong> · {customer.phone}</p>
              <p>{fulfilment === "delivery" ? [customer.address, customer.city, customer.state].filter(Boolean).join(", ") : "Store pickup requested"}</p>
              <p>Cart: {itemCount} item(s), current browser subtotal {money.format(subtotal)}.</p>
              <p>This is a local preview only. No order has been created and no payment has been taken.</p>
            </div>
          )}
        </form>
        <aside className="cart-summary">
          <h2>Order summary</h2>
          {items.map((item) => <div key={item.productId}><span>{item.name} × {item.quantity}</span><strong>{money.format(item.price * item.quantity)}</strong></div>)}
          <div className="cart-summary-total"><span>Subtotal</span><strong>{money.format(subtotal)}</strong></div>
          <div><span>Delivery</span><small>Not calculated</small></div>
          <p>Prices and availability must be confirmed by the server before an order can be accepted. This subtotal is not a final quotation.</p>
          <Link className="button secondary checkout-back" href="/cart">Edit cart</Link>
        </aside>
      </div>
    </main>
  );
}
