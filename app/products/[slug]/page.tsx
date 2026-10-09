import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicSupabaseClient } from "@/lib/supabase/public";

type Props = { params: Promise<{ slug: string }> };

type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  condition: "new" | "used" | "refurbished";
  price: number;
  stock_quantity: number;
  short_description: string | null;
  description: string | null;
  warranty_description: string | null;
  return_eligible: boolean;
  category: { name: string; slug: string } | null;
  images?: { storage_path: string; alt_text: string | null; sort_order: number }[];
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getPublicSupabaseClient();
  if (!supabase) return { title: "Product details" };
  const { data } = await supabase.from("products").select("name,short_description").eq("slug", slug).eq("is_active", true).maybeSingle();
  return { title: data?.name ?? "Product details", description: data?.short_description ?? "Product details from Uncle Joe Computers Shopping Mall." };
}

export const revalidate = 60;

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = getPublicSupabaseClient();

  if (!supabase) {
    return <main className="page-shell"><div className="container page-heading"><Link className="back-link" href="/products">← All products</Link><h1>Product catalogue is being connected</h1><p>Please check back soon.</p></div></main>;
  }

  const { data } = await supabase
    .from("products")
    .select("id,name,slug,brand,condition,price,stock_quantity,short_description,description,warranty_description,return_eligible,category:categories(name,slug),images:product_images(storage_path,alt_text,sort_order)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) notFound();
  const product = data as unknown as ProductDetail;
  const firstImage = [...(product.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  const imageUrl = firstImage ? supabase.storage.from("product-images").getPublicUrl(firstImage.storage_path).data.publicUrl : null;

  return (
    <main className="page-shell">
      <div className="container product-detail">
        <Link className="back-link" href={product.category?.slug ? `/category/${product.category.slug}` : "/products"}>← Back to {product.category?.name ?? "products"}</Link>
        <div className="product-detail-grid">
          {imageUrl ? <div className="product-detail-art product-detail-photo"><Image src={imageUrl} alt={firstImage?.alt_text || product.name} width={720} height={600} unoptimized /></div> : <div className="product-detail-art" aria-hidden="true"><span>UJ</span><small>UNCLE JOE COMPUTERS</small></div>}
          <section className="product-detail-copy">
            {product.category?.name && <span className="eyebrow">{product.category.name}</span>}
            <h1>{product.name}</h1>
            <p className="product-meta">{product.brand || "Quality tech"} · {product.condition}</p>
            <strong className="detail-price">{naira.format(product.price)}</strong>
            <p>{product.short_description || product.description || "Contact our team for specifications and compatibility information."}</p>
            <p className={product.stock_quantity > 0 ? "stock available" : "stock unavailable"}>{product.stock_quantity > 0 ? "In stock — contact us to confirm availability" : "Currently unavailable"}</p>
            {product.warranty_description && <p><strong>Warranty:</strong> {product.warranty_description}</p>}
            <p><strong>Returns:</strong> {product.return_eligible ? "Eligible for return under the shop’s return conditions." : "This item is not currently marked as return-eligible."}</p>
            <Link className="button primary" href="/#contact">Ask about this product</Link>
            <small className="detail-note">Online checkout is not active yet. Please confirm stock and final details with the shop before paying.</small>
          </section>
        </div>
      </div>
    </main>
  );
}
