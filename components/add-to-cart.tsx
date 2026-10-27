"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";

type Props = {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    condition: "new" | "used" | "refurbished";
    stockQuantity: number;
    imageUrl?: string | null;
  };
};

export function AddToCart({ product }: Props) {
  const { addItem } = useCart();
  const [message, setMessage] = useState("");

  const unavailable = product.stockQuantity < 1;
  return (
    <div className="add-to-cart">
      <button
        className="button primary"
        type="button"
        disabled={unavailable}
        onClick={() => {
          addItem({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            condition: product.condition,
            stockQuantity: product.stockQuantity,
            imageUrl: product.imageUrl,
          });
          setMessage(unavailable ? "This item is currently unavailable." : "Added to your cart.");
        }}
      >
        {unavailable ? "Out of stock" : "Add to cart"}
      </button>
      {message && <p className="cart-feedback" role="status">{message}</p>}
    </div>
  );
}
