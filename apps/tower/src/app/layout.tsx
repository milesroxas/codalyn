import type { Metadata } from "next";
import type * as React from "react";
import { resolveMarketingMetadataBase } from "@/server/marketing/marketing-seo";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: resolveMarketingMetadataBase(),
  title: "Tower",
  description: "Codalyn Webflow Data API gateway and dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
