import type { BeaconAppSettings } from "@codalyn/webflow-kit";

export type BeaconTheme = BeaconAppSettings["theme"];

/**
 * Binary light/dark toggle for a single control. Avoids a 3-step cycle
 * (system → light → dark) where "system" can match the previous step visually
 * when OS preference equals the last explicit mode.
 */
export function toggledLightDarkTheme(
  current: string | undefined,
  resolved: "light" | "dark" | undefined
): Extract<BeaconTheme, "light" | "dark"> {
  if (current === "light") return "dark";
  if (current === "dark") return "light";
  if (resolved === "dark") return "light";
  return "dark";
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
