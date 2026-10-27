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
  // These defaults brand the demo as Uncle Joe today. Environment variables
  // can rename the storefront later without changing application code.
  name: publicValue(process.env.NEXT_PUBLIC_STORE_NAME, "Uncle Joe Computers Shopping Mall"),
  shortName: publicValue(process.env.NEXT_PUBLIC_STORE_SHORT_NAME, "UNCLE JOE"),
  tagline: publicValue(
    process.env.NEXT_PUBLIC_STORE_TAGLINE,
    "Technology for work, life and business.",
  ),
  description: publicValue(
    process.env.NEXT_PUBLIC_STORE_DESCRIPTION,
    "Shop computers, laptops, phones, accessories, networking equipment and power solutions from Uncle Joe Computers Shopping Mall.",
  ),
  siteUrl: publicValue(
    process.env.NEXT_PUBLIC_SITE_URL,
    "https://uncle-joe-computers-shopping-mall.vercel.app",
  ),
  locale: publicValue(process.env.NEXT_PUBLIC_STORE_LOCALE, "en_NG"),
  language: supportedLanguage(process.env.NEXT_PUBLIC_STORE_LANGUAGE),
  currency: supportedCurrency(process.env.NEXT_PUBLIC_STORE_CURRENCY),
  location: publicValue(process.env.NEXT_PUBLIC_STORE_LOCATION, "Osogbo, Osun, Nigeria"),
  city: publicValue(process.env.NEXT_PUBLIC_STORE_CITY, "Osogbo"),
  state: publicValue(process.env.NEXT_PUBLIC_STORE_STATE, "Osun"),
  timeZone: supportedTimeZone(process.env.NEXT_PUBLIC_STORE_TIME_ZONE),
  // UI opt-in only; the database must independently enable checkout too.
  checkoutEnabled: process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === "true",
} as const;
