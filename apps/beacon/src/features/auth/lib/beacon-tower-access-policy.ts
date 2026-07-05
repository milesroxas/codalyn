/** Normalized form of Tower's public access policy (`GET /api/v1/beacon/access-policy`). */
export type BeaconTowerAccessPolicy = {
  /** True when sign-up/sign-in require early access; show "Request early access". False opens public "Sign up". */
  earlyAccessRequired: boolean;
};

/** Reads a boolean from primitive, wrapped `{ value }`, or common string/number equivalents; null when absent/malformed. */
function readBooleanLikeValue(raw: unknown): boolean | null {
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "number") {
    if (raw === 1) return true;
    if (raw === 0) return false;
    return null;
  }
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
    return null;
  }
  if (raw && typeof raw === "object" && "value" in raw) {
    return readBooleanLikeValue((raw as { value: unknown }).value);
  }
  return null;
}

/**
 * Normalizes Tower's access-policy response into a stable shape.
 * Returns null for missing/malformed bodies so callers fall back to the safe (early-access) default.
 */
export function normalizeBeaconTowerAccessPolicy(raw: unknown): BeaconTowerAccessPolicy | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const earlyAccessRequired = readBooleanLikeValue((raw as { earlyAccessRequired?: unknown }).earlyAccessRequired);
  if (earlyAccessRequired === null) {
    return null;
  }
  return { earlyAccessRequired };
}
