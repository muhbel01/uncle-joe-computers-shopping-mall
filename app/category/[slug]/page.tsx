import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid, type StoreProduct } from "@/components/product-grid";
import { getPublicSupabaseClient } from "@/lib/supabase/public";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getPublicSupabaseClient();
  if (!supabase) return { title: "Shop Category" };
  const { data } = await supabase.from("categories").select("name,description").eq("slug", slug).eq("is_active", true).maybeSingle();
  return { title: data?.name ?? "Shop Category", description: data?.description ?? "Browse products by category." };
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

  const { data: category } = await supabase.from("categories").select("id,name,description").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!category) notFound();

  const { data } = await supabase
    .from("products")
    .select("id,name,slug,brand,condition,price,stock_quantity,warranty_description,category:categories(name,slug)")
    .eq("category_id", category.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <main className="page-shell">
      <div className="container page-heading">
        <Link href="/" className="back-link">← Home</Link>
        <span className="eyebrow">SHOP BY CATEGORY</span>
        <h1>{category.name}</h1>
        <p>{category.description || "Browse products in this category."}</p>
      </div>
      <section className="container catalogue-section">
        <ProductGrid products={(data ?? []) as unknown as StoreProduct[]} />
      </section>
    </main>
  );
}
