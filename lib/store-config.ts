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

function supportedLanguage(value: string | undefined, fallback = "en-NG"): string {
  const candidate = publicValue(value, fallback);
  try {
    return Intl.DateTimeFormat(candidate).resolvedOptions().locale;
  } catch {
    return fallback;
  }
}

function supportedCurrency(value: string | undefined, fallback = "NGN"): string {
  const candidate = publicValue(value, fallback).toUpperCase();
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: candidate });
    return candidate;
  } catch {
    return fallback;
  }
}

function supportedTimeZone(value: string | undefined, fallback = "Africa/Lagos"): string {
  const candidate = publicValue(value, fallback);
  try {
    return new Intl.DateTimeFormat("en", { timeZone: candidate }).resolvedOptions().timeZone;
  } catch {
    return fallback;
  }
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
  language: supportedLanguage(process.env.NEXT_PUBLIC_STORE_LANGUAGE),
  currency: supportedCurrency(process.env.NEXT_PUBLIC_STORE_CURRENCY),
  location: publicValue(process.env.NEXT_PUBLIC_STORE_LOCATION, "Nigeria"),
  city: publicValue(process.env.NEXT_PUBLIC_STORE_CITY, ""),
  state: publicValue(process.env.NEXT_PUBLIC_STORE_STATE, ""),
  timeZone: supportedTimeZone(process.env.NEXT_PUBLIC_STORE_TIME_ZONE),
  // UI opt-in only; the database must independently enable checkout too.
  checkoutEnabled: process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === "true",
} as const;
