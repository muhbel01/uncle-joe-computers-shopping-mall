import type { MetadataRoute } from "next";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://uncle-joe-computers-shopping-mall-6.vercel.app"
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
