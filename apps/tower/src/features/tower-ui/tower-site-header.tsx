"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { persistBeaconThemePreference, toggledLightDarkTheme } from "@/features/beacon/lib/beacon-theme-preference";
import { Button } from "@/shared/ui/button";
import { SidebarTrigger } from "@/shared/ui/sidebar";

export function TowerSiteHeader() {
  const { data: session } = authClient.useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const effectiveResolved: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = useCallback(() => {
    const next = toggledLightDarkTheme(theme, effectiveResolved);
    setTheme(next);
    if (session?.user) {
      persistBeaconThemePreference(next);
    }
  }, [theme, setTheme, session?.user, effectiveResolved]);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <div className="ml-auto flex items-center gap-2">
          {mounted ? (
            <Button type="button" variant="ghost" size="icon-sm" onClick={cycleTheme} aria-label="Cycle theme">
              {resolvedTheme === "dark" ? (
                <IconSun aria-hidden className="size-4" stroke={1.5} />
              ) : (
                <IconMoon aria-hidden className="size-4" stroke={1.5} />
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
