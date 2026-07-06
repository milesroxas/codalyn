/** Normalized form of Tower's access policy (`GET /api/account/access-policy`). */
export type TowerAccessPolicy = {
  /** True when sign-up/sign-in require early access; show the gate / "Request early access". */
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

/** Normalizes the access-policy response into a stable shape; null for missing/malformed bodies. */
export function normalizeTowerAccessPolicy(raw: unknown): TowerAccessPolicy | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const earlyAccessRequired = readBooleanLikeValue((raw as { earlyAccessRequired?: unknown }).earlyAccessRequired);
  if (earlyAccessRequired === null) {
    return null;
  }
  return { earlyAccessRequired };
}

/**
 * Fail-closed resolver: any missing/malformed/errored policy resolves to "early access required"
 * (show the gate). Matches Beacon's fallback so both surfaces behave consistently, and avoids briefly
 * exposing public sign-up when the policy endpoint blips. The server hook enforces regardless.
 */
export function resolveTowerEarlyAccessRequired(raw: unknown): boolean {
  return normalizeTowerAccessPolicy(raw)?.earlyAccessRequired ?? true;
}
