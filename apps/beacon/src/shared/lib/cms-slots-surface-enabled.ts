/**
 * CMS Slots surface visibility. The flag is a kill switch, not an enable switch: the surface is on unless
 * something explicitly sets `VITE_CMS_SLOTS_SURFACE_ENABLED=false`.
 *
 * It previously required an explicit `"true"` in production builds, but that value only ever lived in a
 * gitignored `.env.local` — so a clean checkout or CI release build silently shipped a bundle where the
 * flagship feature rendered as a permanently disabled tile with no explanation. Defaulting on means the
 * worst case is a build that ships the feature, rather than one that ships a dead tile to a Marketplace
 * reviewer.
 */
export function isCmsSlotsSurfaceEnabled(): boolean {
  return import.meta.env.VITE_CMS_SLOTS_SURFACE_ENABLED?.trim() !== "false";
}
