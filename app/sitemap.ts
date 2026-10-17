import type { MetadataRoute } from "next";

// Do not bake a retailer-specific production domain into this reusable template.
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

// Keep this list aligned with the active category slugs in Supabase.
const categorySlugs = [
  "accessories",
  "cctv-security",
  "computers-laptops",
  "gaming-entertainment",
  "networking",
  "phones-tablets",
  "power-solar",
  "printers-office",
  "smart-home",
  "storage-memory",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/products`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/guides`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...categorySlugs.map((slug) => ({
      url: `${siteUrl}/category/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
