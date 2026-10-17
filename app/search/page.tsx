import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid, type StoreProduct } from "@/components/product-grid";
import { getPublicSupabaseClient } from "@/lib/supabase/public";
import { storeConfig } from "@/lib/store-config";

export const metadata: Metadata = { title: "Search Products" };
export const revalidate = 30;

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const term = q.trim().slice(0, 80);
  const supabase = getPublicSupabaseClient();
  let products: StoreProduct[] = [];
  let searchError = false;
  let searchConfigured = Boolean(supabase);

  if (supabase && term.length >= 2) {
    const safeTerm = term.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim();
    if (safeTerm) {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id,name,slug,brand,condition,price,stock_quantity,warranty_description,category:categories(name,slug),images:product_images(storage_path,alt_text,sort_order)")
          .eq("is_active", true)
          .or(`name.ilike.%${safeTerm}%,brand.ilike.%${safeTerm}%,sku.ilike.%${safeTerm}%`)
          .order("created_at", { ascending: false })
          .limit(60);

        if (error) {
          searchError = true;
        } else {
          products = ((data ?? []) as unknown as Array<StoreProduct & { images?: { storage_path: string; alt_text: string | null; sort_order: number }[] }>).map((product) => {
            const first = [...(product.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
            return { ...product, image_url: first ? supabase.storage.from("product-images").getPublicUrl(first.storage_path).data.publicUrl : null, image_alt: first?.alt_text ?? product.name };
          });
        }
      } catch {
        searchError = true;
      }
    }
  }

  return (
    <main className="page-shell">
      <div className="container page-heading">
        <Link href="/" className="back-link">← Home</Link>
        <span className="eyebrow">SEARCH {storeConfig.shortName}</span>
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
        {term.length < 2 ? (
          <div className="catalogue-placeholder" role="status">
            <strong>Search the catalogue</strong>
            <small>Enter at least two characters to find products by name, brand or SKU.</small>
          </div>
        ) : !searchConfigured ? (
          <div className="catalogue-placeholder" role="status">
            <strong>Catalogue setup in progress</strong>
            <small>Product search is not configured for this store yet. Please check back later.</small>
          </div>
        ) : searchError ? (
          <div className="catalogue-placeholder" role="alert">
            <strong>Search is temporarily unavailable</strong>
            <small>We could not load catalogue results. Please try again shortly.</small>
          </div>
        ) : products.length === 0 ? (
          <div className="catalogue-placeholder" role="status">
            <strong>No matching products found</strong>
            <small>Try a different product name, brand or SKU.</small>
            <Link className="button secondary" href="/products">Browse all products</Link>
          </div>
        ) : <ProductGrid products={products} />}
      </section>
    </main>
  );
}
