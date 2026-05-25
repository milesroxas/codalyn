import type { TowerEntitlement, TowerTier } from "@/server/billing/entitlements";
import type { TowerLimitsSnapshot } from "@/server/billing/tower-limits-config";
import { isGlobalMeteringDisabled, tierLimitsFromSnapshot } from "@/server/billing/tower-limits-config";

export type MeteringOverrideFields = {
  meteringEnabled: boolean;
  webflowRequestLimitOverride: number | null;
  imageOptimizeLimitOverride: number | null;
};

export type MeteringPolicyInput = {
  tier: TowerTier;
  user: MeteringOverrideFields;
  organization: MeteringOverrideFields | null;
  limits: TowerLimitsSnapshot;
};

export type MeteringPolicy = {
  skipMetering: boolean;
  webflowCap: number | null;
  imageCap: number | null;
  tier: TowerTier;
  globalMeteringDisabled: boolean;
};

export function utcYearMonth(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  return `${y}-${m < 10 ? "0" : ""}${m}`;
}

function tierDefaultCap(kind: "webflow" | "image", tier: TowerTier, limits: TowerLimitsSnapshot): number {
  const tierLimits = tierLimitsFromSnapshot(limits, tier);
  return kind === "webflow" ? tierLimits.webflowRequestsPerMonth : tierLimits.imageOptimizesPerMonth;
}

function resolveCap(
  kind: "webflow" | "image",
  tier: TowerTier,
  user: MeteringOverrideFields,
  organization: MeteringOverrideFields | null,
  limits: TowerLimitsSnapshot
): number | null {
  if (tier === "pro") {
    return null;
  }
  const userOverride = kind === "webflow" ? user.webflowRequestLimitOverride : user.imageOptimizeLimitOverride;
  if (userOverride !== null) {
    return userOverride;
  }
  const orgOverride =
    organization === null
      ? null
      : kind === "webflow"
        ? organization.webflowRequestLimitOverride
        : organization.imageOptimizeLimitOverride;
  if (orgOverride !== null) {
    return orgOverride;
  }
  return tierDefaultCap(kind, tier, limits);
}

export function resolveMeteringPolicy(input: MeteringPolicyInput): MeteringPolicy {
  const globalMeteringDisabled = isGlobalMeteringDisabled(input.limits);
  const skipMetering =
    globalMeteringDisabled ||
    !input.user.meteringEnabled ||
    (input.organization !== null && !input.organization.meteringEnabled) ||
    input.tier === "pro";

  return {
    skipMetering,
    webflowCap: skipMetering ? null : resolveCap("webflow", input.tier, input.user, input.organization, input.limits),
    imageCap: skipMetering ? null : resolveCap("image", input.tier, input.user, input.organization, input.limits),
    tier: input.tier,
    globalMeteringDisabled,
  };
}

export function resolveMeteringPolicyFromEntitlement(
  entitlement: TowerEntitlement,
  user: MeteringOverrideFields,
  organization: MeteringOverrideFields | null,
  limits: TowerLimitsSnapshot
): MeteringPolicy {
  return resolveMeteringPolicy({
    tier: entitlement.tier,
    user,
    organization,
    limits,
  });
}

export function parseLimitOverrideField(raw: unknown): number | null | "invalid" {
  if (raw === null) {
    return null;
  }
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || raw > 10_000_000 || !Number.isInteger(raw)) {
    return "invalid";
  }
  return raw;
}

export const EMPTY_METERING_OVERRIDES: MeteringOverrideFields = {
  meteringEnabled: true,
  webflowRequestLimitOverride: null,
  imageOptimizeLimitOverride: null,
};
