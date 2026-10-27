/** Strips a trailing slash so paths can be appended verbatim; an empty or unset value stays empty. */
export function normalizeTowerOrigin(raw: string | undefined): string {
  return (raw ?? "").replace(/\/$/, "");
}

/**
 * The Tower origin baked into this build by `vite.config` (`__BEACON_TOWER_ORIGIN__`): every mode
 * resolves one, release builds assert it in the output, and Vitest bakes a fixed test origin. There is
 * no runtime fallback — an unconfigured origin is a build error, not something to guess at runtime.
 */
export function readBeaconTowerOrigin(): string {
  return normalizeTowerOrigin(__BEACON_TOWER_ORIGIN__);
}

export function isBeaconTowerOriginConfigured(): boolean {
  return readBeaconTowerOrigin().length > 0;
}
