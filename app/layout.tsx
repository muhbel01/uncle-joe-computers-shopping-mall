import type { Metadata } from "next";
import { storeConfig } from "@/lib/store-config";
import { CartProvider } from "@/components/cart-provider";
import "./globals.css";
import "./demo-refresh.css";

export const metadata: Metadata = {
  metadataBase: new URL(storeConfig.siteUrl),
  title: {
    default: storeConfig.name,
    template: `%s | ${storeConfig.shortName}`,
  },
  description: storeConfig.description,
  applicationName: storeConfig.name,
  openGraph: {
    type: "website",
    locale: storeConfig.locale,
    siteName: storeConfig.name,
    title: storeConfig.name,
    description: storeConfig.description,
  },
  twitter: {
    card: "summary",
    title: storeConfig.name,
    description: storeConfig.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={storeConfig.language}>
      <body><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
