"use client";

import { ThemeProvider } from "next-themes";
import type * as React from "react";
import { TowerBeaconThemeSync } from "@/features/beacon/ui/tower-beacon-theme-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="tower-ui-theme"
    >
      <TowerBeaconThemeSync>{children}</TowerBeaconThemeSync>
    </ThemeProvider>
  );
}
