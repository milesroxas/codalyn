/** Tower origin baked at build time (`vite.config` → `__FLINT_TOWER_ORIGIN__`). */
export function readFlintTowerOrigin(): string {
  const baked = __FLINT_TOWER_ORIGIN__.replace(/\/$/, "");
  if (baked.length > 0) {
    return baked;
  }
  return import.meta.env.VITE_TOWER_ORIGIN?.replace(/\/$/, "") ?? "";
}

/**
 * Whether Tower is configured for this build. When false, Flint runs fully
 * offline (free tier) and never issues a Tower request.
 */
export function isFlintTowerOriginConfigured(): boolean {
  return readFlintTowerOrigin().length > 0;
}
