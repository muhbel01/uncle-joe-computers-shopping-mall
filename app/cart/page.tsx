"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { storeConfig } from "@/lib/store-config";

const money = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: storeConfig.currency,
  maximumFractionDigits: 0,
});

export default function CartPage() {
  const { items, hydrated, itemCount, subtotal, setQuantity, removeItem } = useCart();

  if (!hydrated) {
    return <main className="page-shell"><div className="container page-heading"><h1>Your cart</h1><p>Loading your saved cart…</p></div></main>;
  }

  return (
    <main className="page-shell">
      <div className="container page-heading">
        <Link href="/products" className="back-link">← Continue shopping</Link>
        <span className="eyebrow">{storeConfig.shortName}</span>
        <h1>Your cart</h1>
        <p>{itemCount} {itemCount === 1 ? "item" : "items"} in your cart.</p>
      </div>
      <div className="container cart-layout">
        <section className="cart-items" aria-label="Cart items">
          {items.length === 0 ? (
            <div className="catalogue-placeholder">
              <span>🛒</span>
              <strong>Your cart is empty</strong>
              <small>Explore the catalogue and add products you are interested in.</small>
              <Link className="button primary" href="/products">Browse products</Link>
            </div>
          ) : items.map((item) => (
            <article className="cart-line" key={item.productId}>
              <div className="cart-line-image">
                {item.imageUrl ? <Image src={item.imageUrl} alt="" width={100} height={100} unoptimized /> : <span>{storeConfig.shortName.slice(0, 2).toUpperCase()}</span>}
              </div>
              <div className="cart-line-details">
                <Link className="cart-product-name" href={`/products/${item.slug}`}>{item.name}</Link>
                <small>{item.condition} · {money.format(item.price)} each</small>
                <label className="quantity-control">
                  <span>Quantity</span>
                  <input
                    aria-label={`Quantity for ${item.name}`}
                    type="number"
                    min={1}
                    max={item.stockQuantity}
                    value={item.quantity}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (event.target.value !== "") setQuantity(item.productId, next);
                    }}
                  />
                </label>
                <button className="text-button" type="button" onClick={() => removeItem(item.productId)}>Remove</button>
              </div>
              <strong className="cart-line-total">{money.format(item.price * item.quantity)}</strong>
            </article>
          ))}
        </section>
        <aside className="cart-summary">
          <h2>Order summary</h2>
          <div><span>Subtotal</span><strong>{money.format(subtotal)}</strong></div>
          <div><span>Delivery</span><small>Calculated after delivery details are confirmed.</small></div>
          <div className="cart-summary-total"><span>Estimated total</span><strong>{money.format(subtotal)}</strong></div>
          <p>Prices and availability must be confirmed before an order is accepted. Delivery, discounts and any applicable charges are not included.</p>
          <button className="button primary checkout-disabled" type="button" disabled>Checkout — coming next</button>
          <small>Online orders and payments are not active yet.</small>
        </aside>
      </div>
    </main>
  );
}
