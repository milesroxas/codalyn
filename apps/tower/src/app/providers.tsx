"use client";

import { ThemeProvider } from "next-themes";
import type * as React from "react";
import { PostHogProvider } from "@/shared/lib/posthog-provider";
import { Toaster } from "@/shared/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="tower-ui-theme"
      >
        {children}
        <Toaster />
      </ThemeProvider>
    </PostHogProvider>
  );
}
