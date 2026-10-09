import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid, type StoreProduct } from "@/components/product-grid";
import { getPublicSupabaseClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Shop Products",
  description: "Browse available computers, phones, accessories and technology products at Uncle Joe Computers Shopping Mall.",
};

export const revalidate = 60;

export default async function ProductsPage() {
  const supabase = getPublicSupabaseClient();
  let products: StoreProduct[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("products")
      .select("id,name,slug,brand,condition,price,stock_quantity,warranty_description,category:categories(name,slug)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(60);
    products = (data ?? []) as unknown as StoreProduct[];
  }

  return (
    <main className="page-shell">
      <div className="container page-heading">
        <Link href="/" className="back-link">← Home</Link>
        <span className="eyebrow">UNCLE JOE COMPUTERS</span>
        <h1>Shop all products</h1>
        <p>Browse our published stock. Product condition, price and warranty information are shown where available.</p>
      </div>
      <section className="container catalogue-section">
        <ProductGrid products={products} />
      </section>
    </main>
  );
}
