/**
 * Product feature flags for Beacon (Designer extension).
 * Extended features are an umbrella for optional surfaces (CMS editor tools today; more later).
 * `VITE_BEACON_CMS_EDITOR` remains supported as a legacy alias for the same gate.
 */
function isEnvFlagTrue(value: unknown): boolean {
  return value === "true" || value === "1";
}

export function isBeaconExtendedFeaturesEnabled(): boolean {
  return (
    isEnvFlagTrue(import.meta.env.VITE_BEACON_EXTENDED_FEATURES) ||
    isEnvFlagTrue(import.meta.env.VITE_BEACON_CMS_EDITOR)
  );
}
