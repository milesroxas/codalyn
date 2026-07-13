"use client";

import { ThemeProvider } from "next-themes";
import type * as React from "react";
import { TowerSupportFab } from "@/features/tower-ui/ui/tower-support-fab";
import { ConsentProvider } from "@/shared/lib/consent/consent-provider";
import { PostHogProvider } from "@/shared/lib/posthog-provider";
import { Toaster } from "@/shared/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConsentProvider>
      <PostHogProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="tower-ui-theme"
        >
          {children}
          <TowerSupportFab />
          <Toaster />
        </ThemeProvider>
      </PostHogProvider>
    </ConsentProvider>
  );
}
