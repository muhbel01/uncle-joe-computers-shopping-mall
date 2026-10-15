import type { Metadata } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://uncle-joe-computers-shopping-mall-6.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Uncle Joe Computers Shopping Mall",
    template: "%s | Uncle Joe Computers",
  },
  description:
    "Shop computers, laptops, phones, accessories, networking and power products from Uncle Joe Computers Shopping Mall in Osogbo, Nigeria.",
  applicationName: "Uncle Joe Computers Shopping Mall",
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: "Uncle Joe Computers Shopping Mall",
    title: "Uncle Joe Computers Shopping Mall",
    description:
      "Computers, laptops, phones, accessories, networking and power products in Osogbo, Nigeria.",
  },
  twitter: {
    card: "summary",
    title: "Uncle Joe Computers Shopping Mall",
    description:
      "Computers, laptops, phones, accessories, networking and power products in Osogbo, Nigeria.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG">
      <body>{children}</body>
    </html>
  );
}
