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
      .select("id,name,slug,brand,condition,price,stock_quantity,warranty_description,category:categories(name,slug),images:product_images(storage_path,alt_text,sort_order)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(60);
    products = ((data ?? []) as unknown as Array<StoreProduct & { images?: { storage_path: string; alt_text: string | null; sort_order: number }[] }>).map((product) => { const first = [...(product.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]; return { ...product, image_url: first ? supabase.storage.from("product-images").getPublicUrl(first.storage_path).data.publicUrl : null, image_alt: first?.alt_text ?? product.name }; });
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
