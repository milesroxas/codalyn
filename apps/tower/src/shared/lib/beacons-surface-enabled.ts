/**
 * Beacons **composer** surface (Beacon Designer extension `/beacons` + Tower CMS layout APIs).
 * Not the Beacon image editor, `/beacon` preset page, or `/api/v1/beacon/settings`.
 *
 * Align semantics with Beacon `VITE_BEACONS_SURFACE_ENABLED`.
 *
 * - Production: enabled only when `NEXT_PUBLIC_BEACONS_SURFACE_ENABLED === "true"`.
 * - Non-production: enabled unless explicitly `"false"`.
 */
export function isBeaconsSurfaceEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_BEACONS_SURFACE_ENABLED?.trim();
  if (process.env.NODE_ENV === "production") {
    return v === "true";
  }
  return v !== "false";
}
