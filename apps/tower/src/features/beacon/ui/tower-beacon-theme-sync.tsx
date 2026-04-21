"use client";

import type { BeaconAppSettings } from "@codalyn/webflow-kit";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect } from "react";
import { authClient } from "@/features/auth/model/auth-client";

type Envelope = { settings?: BeaconAppSettings };

function applyServerTheme(data: unknown, setTheme: (t: string) => void): void {
  const t =
    data !== null && typeof data === "object" && "settings" in data ? (data as Envelope).settings?.theme : undefined;
  if (t === "light" || t === "dark" || t === "system") {
    setTheme(t);
  }
}

export function TowerBeaconThemeSync({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!session?.user) {
      return;
    }
    let cancelled = false;
    const pull = () => {
      void fetch("/api/v1/beacon/settings", { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled && data) {
            applyServerTheme(data, setTheme);
          }
        })
        .catch(() => {});
    };
    pull();
    const onVis = () => {
      if (document.visibilityState === "visible") {
        pull();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [session?.user, setTheme]);

  return children;
}
