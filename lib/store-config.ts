/**
 * Public storefront configuration.
 *
 * Keep this file free of secrets. Values here are intended for metadata and
 * customer-facing UI only. A retailer can customise the deployment through
 * environment variables without changing the application source.
 */
function publicValue(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export const storeConfig = {
  name: publicValue(process.env.NEXT_PUBLIC_STORE_NAME, "Demo Tech Store"),
  shortName: publicValue(process.env.NEXT_PUBLIC_STORE_SHORT_NAME, "DEMO TECH"),
  tagline: publicValue(
    process.env.NEXT_PUBLIC_STORE_TAGLINE,
    "Smarter tech. Better value.",
  ),
  description: publicValue(
    process.env.NEXT_PUBLIC_STORE_DESCRIPTION,
    "Browse technology, electronics and everyday essentials from our online store.",
  ),
  siteUrl: publicValue(
    process.env.NEXT_PUBLIC_SITE_URL,
    "http://localhost:3000",
  ),
  locale: publicValue(process.env.NEXT_PUBLIC_STORE_LOCALE, "en_NG"),
  language: publicValue(process.env.NEXT_PUBLIC_STORE_LANGUAGE, "en-NG"),
  currency: publicValue(process.env.NEXT_PUBLIC_STORE_CURRENCY, "NGN"),
  location: publicValue(process.env.NEXT_PUBLIC_STORE_LOCATION, "Nigeria"),
  // UI opt-in only; the database must independently enable checkout too.
  checkoutEnabled: process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === "true",
} as const;
