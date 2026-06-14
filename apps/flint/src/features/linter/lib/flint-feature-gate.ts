import { type FlintTier, isPaidFlintTier } from "@/shared/lib/flint-entitlement";

/**
 * Client-side feature gating derived from the Tower entitlement tier. This is
 * ADVISORY (UX only) — Tower's `/api/v1/flint/*` endpoints enforce entitlement
 * server-side. Free tier resolves every gate to its offline-safe value so Flint
 * behaves identically to its no-account build.
 */
export type FlintFeatureGate = {
  tier: FlintTier;
  /** Personal settings / rule-config sync to Tower across devices. */
  cloudSync: boolean;
  /** Author and consume team-shared rule config + presets. */
  teamConfig: boolean;
  /** Persist lint-run reports / history to Tower. */
  lintReports: boolean;
  /** Maximum number of user-authored custom presets (0 = built-ins only). */
  maxCustomPresets: number;
};

/** `Infinity` is intentional for unlimited tiers; callers compare with `<`/`>=`. */
const MAX_CUSTOM_PRESETS_BY_TIER: Record<FlintTier, number> = {
  free: 0,
  pro: 10,
  studio: 50,
  team: Number.POSITIVE_INFINITY,
};

export function resolveFlintFeatureGate(tier: FlintTier): FlintFeatureGate {
  const paid = isPaidFlintTier(tier);
  return {
    tier,
    cloudSync: paid,
    // Team-shared config requires a workspace plan; pro/studio are individual.
    teamConfig: tier === "team",
    lintReports: paid,
    maxCustomPresets: MAX_CUSTOM_PRESETS_BY_TIER[tier],
  };
}
