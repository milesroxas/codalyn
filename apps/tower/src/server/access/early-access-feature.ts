/**
 * When enabled, Tower sign-up and sign-in require early access (operator invite, team invite, or prior grant).
 * Default: off (unset or any value other than `1`, `true`, `yes`).
 */
export function isTowerEarlyAccessGateEnabled(): boolean {
  const v = process.env.TOWER_EARLY_ACCESS_GATE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
