/**
 * Beacons **composer** surface (Designer `/beacons`, list targets, page custom code sync).
 * Independent of the Beacon image editor or Tower preset settings.
 *
 * Align semantics with Tower `NEXT_PUBLIC_BEACONS_SURFACE_ENABLED`.
 *
 * - Production builds (`import.meta.env.PROD`): enabled only when `VITE_BEACONS_SURFACE_ENABLED === "true"`.
 * - Development: enabled unless explicitly `"false"`.
 */
export function isBeaconsSurfaceEnabled(): boolean {
  const v = import.meta.env.VITE_BEACONS_SURFACE_ENABLED?.trim();
  if (import.meta.env.PROD) {
    return v === "true";
  }
  return v !== "false";
}
