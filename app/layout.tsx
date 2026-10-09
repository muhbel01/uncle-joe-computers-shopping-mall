import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Uncle Joe Computers Shopping Mall",
    template: "%s | Uncle Joe Computers",
  },
  description:
    "Shop computers, laptops, phones, accessories, networking and power products from Uncle Joe Computers Shopping Mall in Osogbo, Nigeria.",
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
