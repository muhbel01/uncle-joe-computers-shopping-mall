import type { MetadataRoute } from "next";
import { getPublicSupabaseClient } from "@/lib/supabase/public";

// Use the deployment's canonical URL; localhost is only a development fallback.
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/products`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/guides`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  // Derive public catalogue URLs from the current store rather than shipping
  // category slugs that may belong to a different retailer.
  const supabase = getPublicSupabaseClient();
  if (!supabase) return entries;

  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("slug,updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(5000),
    supabase
      .from("products")
      .select("slug,updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(5000),
  ]);

  for (const category of categoriesResult.data ?? []) {
    entries.push({
      url: `${siteUrl}/category/${category.slug}`,
      lastModified: category.updated_at ? new Date(category.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const product of productsResult.data ?? []) {
    entries.push({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : now,
      changeFrequency: "daily",
      priority: 0.5,
    });
  }

  return entries;
}
