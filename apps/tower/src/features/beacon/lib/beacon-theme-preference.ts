import type { BeaconAppSettings } from "@codalyn/webflow-kit";

export type BeaconTheme = BeaconAppSettings["theme"];

const THEME_ORDER: readonly BeaconTheme[] = ["system", "light", "dark"];

export function nextCycledBeaconTheme(current: string | undefined): BeaconTheme {
  const cur = current === "light" || current === "dark" || current === "system" ? current : "system";
  const idx = THEME_ORDER.indexOf(cur);
  return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
}

/** Fire-and-forget sync to Tower user Beacon payload (no-op if request fails). */
export function persistBeaconThemePreference(theme: BeaconTheme): void {
  void fetch("/api/v1/beacon/settings", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme }),
  });
}
