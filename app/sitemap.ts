import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://uncle-joe-computers-shopping-mall-6.vercel.app";

const categorySlugs = [
  "computers-laptops",
  "phones-tablets",
  "printers-office",
  "accessories",
  "networking",
  "cctv-security",
  "gaming-entertainment",
  "storage-memory",
  "power-solar",
  "smart-home",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const publicPages: MetadataRoute.Sitemap = [
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

  return publicPages;
}
