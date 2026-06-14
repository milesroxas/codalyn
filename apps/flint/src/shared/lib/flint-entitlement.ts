import { TOWER_PLAN_KEYS, type TowerPlanKey } from "@codalyn/webflow-kit";

/**
 * Boundary normalizer for the entitlement returned by Tower's
 * `GET /api/v1/flint/settings`. Treats the value as a runtime union and defaults
 * to the safe offline tier (`free`) on any missing/malformed shape, so a broken
 * or unreachable Tower never accidentally unlocks paid features client-side.
 * (Server endpoints enforce entitlement independently.)
 */

export type FlintTier = TowerPlanKey;
export type FlintEntitlementSource = "none" | "user_stripe" | "workspace_team";

export type FlintEntitlement = {
  tier: FlintTier;
  source: FlintEntitlementSource;
};

const TIERS = new Set<string>(TOWER_PLAN_KEYS);
const SOURCES = new Set<FlintEntitlementSource>(["none", "user_stripe", "workspace_team"]);

export function getDefaultFlintEntitlement(): FlintEntitlement {
  return { tier: "free", source: "none" };
}

function readTier(raw: unknown): FlintTier {
  return typeof raw === "string" && TIERS.has(raw) ? (raw as FlintTier) : "free";
}

function readSource(raw: unknown): FlintEntitlementSource {
  return typeof raw === "string" && SOURCES.has(raw as FlintEntitlementSource)
    ? (raw as FlintEntitlementSource)
    : "none";
}

/** Normalize an unknown entitlement value (primitive or `{ tier, source }`) to a safe shape. */
export function normalizeFlintEntitlement(raw: unknown): FlintEntitlement {
  if (typeof raw === "string") {
    return { tier: readTier(raw), source: "none" };
  }
  if (!raw || typeof raw !== "object") {
    return getDefaultFlintEntitlement();
  }
  const o = raw as Record<string, unknown>;
  return { tier: readTier(o.tier), source: readSource(o.source) };
}

/** Any plan above free unlocks Tower-backed sync. */
export function isPaidFlintTier(tier: FlintTier): boolean {
  return tier !== "free";
}
