import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid, type StoreProduct } from "@/components/product-grid";
import { getPublicSupabaseClient } from "@/lib/supabase/public";
import { storeConfig } from "@/lib/store-config";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getPublicSupabaseClient();
  if (!supabase) return { title: "Shop Category" };

  try {
    const { data, error } = await supabase
      .from("categories")
      .select("name,description")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) return { title: "Shop Category" };
    return {
      title: data?.name ?? "Shop Category",
      description: data?.description ?? "Browse products by category.",
    };
  } catch {
    return { title: "Shop Category" };
  }
}

export const revalidate = 60;

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const supabase = getPublicSupabaseClient();

  if (!supabase) {
    return (
      <main className="page-shell">
        <div className="container page-heading">
          <Link href="/" className="back-link">← Home</Link>
          <h1>Shop by category</h1>
          <p>The catalogue connection is being configured. Please check back soon.</p>
        </div>
      </main>
    );
  }

  let category: { id: string; name: string; description: string | null } | null = null;
  let categoryUnavailable = false;
  try {
    const result = await supabase
      .from("categories")
      .select("id,name,description")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    category = result.data;
    categoryUnavailable = Boolean(result.error);
  } catch {
    categoryUnavailable = true;
  }

  if (categoryUnavailable) {
    return (
      <main className="page-shell">
        <div className="container page-heading">
          <Link href="/" className="back-link">← Home</Link>
          <h1>Category temporarily unavailable</h1>
          <p>We couldn’t load this category right now. Please try again shortly.</p>
        </div>
      </main>
    );
  }
  if (!category) notFound();

  let products: Array<StoreProduct & { images?: { storage_path: string; alt_text: string | null; sort_order: number }[] }> = [];
  let productsUnavailable = false;
  try {
    const result = await supabase
      .from("products")
      .select("id,name,slug,brand,condition,price,stock_quantity,warranty_description,category:categories(name,slug),images:product_images(storage_path,alt_text,sort_order)")
      .eq("category_id", category.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(60);
    productsUnavailable = Boolean(result.error);
    products = (result.data ?? []) as unknown as typeof products;
  } catch {
    productsUnavailable = true;
  }

  const storeProducts = products.map((product) => {
    const first = [...(product.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      ...product,
      image_url: first ? supabase.storage.from("product-images").getPublicUrl(first.storage_path).data.publicUrl : null,
      image_alt: first?.alt_text ?? product.name,
    };
  });

  return (
    <main className="page-shell">
      <div className="container page-heading">
        <Link href="/" className="back-link">← Home</Link>
        <span className="eyebrow">SHOP {storeConfig.shortName} BY CATEGORY</span>
        <h1>{category.name}</h1>
        <p>{category.description || "Browse products in this category."}</p>
      </div>
      <section className="container catalogue-section">
        {productsUnavailable ? (
          <p role="status">Products in this category could not be loaded. Please try again shortly.</p>
        ) : (
          <ProductGrid products={storeProducts} />
        )}
      </section>
    </main>
  );
}
