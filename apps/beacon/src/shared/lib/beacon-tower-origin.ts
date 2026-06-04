/** Tower origin baked at build time (`vite.config` → `__BEACON_TOWER_ORIGIN__`). */
export function readBeaconTowerOrigin(): string {
  const baked = __BEACON_TOWER_ORIGIN__.replace(/\/$/, "");
  if (baked.length > 0) {
    return baked;
  }
  return import.meta.env.VITE_TOWER_ORIGIN?.replace(/\/$/, "") ?? "";
}

export function isBeaconTowerOriginConfigured(): boolean {
  return readBeaconTowerOrigin().length > 0;
}
