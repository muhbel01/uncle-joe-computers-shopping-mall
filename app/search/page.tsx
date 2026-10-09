import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid, type StoreProduct } from "@/components/product-grid";
import { getPublicSupabaseClient } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Search Products" };
export const revalidate = 30;

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const term = q.trim().slice(0, 80);
  const supabase = getPublicSupabaseClient();
  let products: StoreProduct[] = [];

  if (supabase && term.length >= 2) {
    const safeTerm = term.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim();
    if (safeTerm) {
      const { data } = await supabase
        .from("products")
        .select("id,name,slug,brand,condition,price,stock_quantity,warranty_description,category:categories(name,slug),images:product_images(storage_path,alt_text,sort_order)")
        .eq("is_active", true)
        .or(`name.ilike.%${safeTerm}%,brand.ilike.%${safeTerm}%,sku.ilike.%${safeTerm}%`)
        .order("created_at", { ascending: false })
        .limit(60);
      products = ((data ?? []) as unknown as Array<StoreProduct & { images?: { storage_path: string; alt_text: string | null; sort_order: number }[] }>).map((product) => { const first = [...(product.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]; return { ...product, image_url: first ? supabase.storage.from("product-images").getPublicUrl(first.storage_path).data.publicUrl : null, image_alt: first?.alt_text ?? product.name }; });
    }
  }

  return (
    <main className="page-shell">
      <div className="container page-heading">
        <Link href="/" className="back-link">← Home</Link>
        <span className="eyebrow">FIND YOUR TECH</span>
        <h1>Search products</h1>
        <form className="search search-page-form" action="/search">
          <label className="sr-only" htmlFor="q">Search products</label>
          <input id="q" name="q" defaultValue={term} placeholder="Search by product, brand or SKU" />
          <button type="submit">Search</button>
        </form>
        {term.length > 0 && <p>Results for “{term}”</p>}
        {term.length === 1 && <p>Enter at least two characters to search.</p>}
      </div>
      <section className="container catalogue-section">
        <ProductGrid products={products} />
      </section>
    </main>
  );
}
