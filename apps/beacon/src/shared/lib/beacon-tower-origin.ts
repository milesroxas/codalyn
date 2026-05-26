/** Tower origin baked at build time (`vite.config` → `import.meta.env.VITE_TOWER_ORIGIN`). */
export function readBeaconTowerOrigin(): string {
  return import.meta.env.VITE_TOWER_ORIGIN?.replace(/\/$/, "") ?? "";
}

export function isBeaconTowerOriginConfigured(): boolean {
  return readBeaconTowerOrigin().length > 0;
}
