"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  condition: "new" | "used" | "refurbished";
  stockQuantity: number;
  quantity: number;
  imageUrl?: string | null;
};

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "storefront-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const safe = parsed.filter((item): item is CartItem =>
            item &&
            typeof item.productId === "string" &&
            typeof item.slug === "string" &&
            typeof item.name === "string" &&
            (item.condition === "new" || item.condition === "used" || item.condition === "refurbished") &&
            Number.isFinite(item.price) && item.price >= 0 &&
            Number.isInteger(item.quantity) && item.quantity > 0 &&
            Number.isInteger(item.stockQuantity) && item.stockQuantity >= 0 &&
            (item.imageUrl == null || typeof item.imageUrl === "string")
          ).map((item) => ({ ...item, quantity: Math.min(item.quantity, item.stockQuantity) }))
            .filter((item) => item.quantity > 0);
          setItems(safe);
        }
      }
    } catch {
      // Storage can be blocked or unavailable in private browsing; keep the cart usable in memory.
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage cleanup failures.
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // The cart remains usable for this session even when persistence is unavailable.
    }
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    if (item.stockQuantity < 1) return;
    const requested = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
    const amount = Math.max(1, Math.min(requested, item.stockQuantity));
    setItems((current) => {
      const existing = current.find((entry) => entry.productId === item.productId);
      if (!existing) return [...current, { ...item, quantity: amount }];
      return current.map((entry) => entry.productId === item.productId
        ? { ...entry, ...item, quantity: Math.min(entry.quantity + amount, item.stockQuantity) }
        : entry);
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    if (!Number.isFinite(quantity)) return;
    setItems((current) => current.flatMap((item) => {
      if (item.productId !== productId) return [item];
      if (quantity <= 0 || item.stockQuantity <= 0) return [];
      return [{ ...item, quantity: Math.max(1, Math.min(Math.floor(quantity), item.stockQuantity)) }];
    }));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const value = useMemo(() => ({ items, hydrated, itemCount, subtotal, addItem, setQuantity, removeItem, clearCart }), [items, hydrated, itemCount, subtotal, addItem, setQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used within CartProvider");
  return value;
}
