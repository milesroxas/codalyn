import type { Metadata } from "next";
import type * as React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tower",
  description: "Codalyn Webflow Data API gateway and dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
