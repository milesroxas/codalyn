import type { TowerEntitlement, TowerTier } from "@/server/billing/entitlements";
import type { TowerLimitsSnapshot, TowerTierLimits } from "@/server/billing/tower-limits-config";
import { isGlobalMeteringDisabled, tierLimitsFromSnapshot } from "@/server/billing/tower-limits-config";

export type MeterKind = "webflowProxy" | "cmsWrite" | "image";

export type MeteringOverrideFields = {
  meteringEnabled: boolean;
  webflowProxyLimitOverride: number | null;
  cmsWriteLimitOverride: number | null;
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
  webflowProxyCap: number | null;
  cmsWriteCap: number | null;
  imageCap: number | null;
  tier: TowerTier;
  globalMeteringDisabled: boolean;
};

export function utcYearMonth(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  return `${y}-${m < 10 ? "0" : ""}${m}`;
}

function tierDefaultCap(kind: MeterKind, tier: TowerTier, limits: TowerLimitsSnapshot): number {
  const tierLimits = tierLimitsFromSnapshot(limits, tier);
  return tierLimitField(tierLimits, kind);
}

function tierLimitField(tierLimits: TowerTierLimits, kind: MeterKind): number {
  switch (kind) {
    case "webflowProxy":
      return tierLimits.webflowProxyRequestsPerMonth;
    case "cmsWrite":
      return tierLimits.cmsWritesPerMonth;
    case "image":
      return tierLimits.imageOptimizesPerMonth;
  }
}

function overrideField(fields: MeteringOverrideFields, kind: MeterKind): number | null {
  switch (kind) {
    case "webflowProxy":
      return fields.webflowProxyLimitOverride;
    case "cmsWrite":
      return fields.cmsWriteLimitOverride;
    case "image":
      return fields.imageOptimizeLimitOverride;
  }
}

function resolveCap(
  kind: MeterKind,
  tier: TowerTier,
  user: MeteringOverrideFields,
  organization: MeteringOverrideFields | null,
  limits: TowerLimitsSnapshot
): number | null {
  const userOverride = overrideField(user, kind);
  if (userOverride !== null) {
    return userOverride;
  }
  const orgOverride = organization === null ? null : overrideField(organization, kind);
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
    (input.organization !== null && !input.organization.meteringEnabled);

  return {
    skipMetering,
    webflowProxyCap: skipMetering
      ? null
      : resolveCap("webflowProxy", input.tier, input.user, input.organization, input.limits),
    cmsWriteCap: skipMetering ? null : resolveCap("cmsWrite", input.tier, input.user, input.organization, input.limits),
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

export function capForMeterKind(policy: MeteringPolicy, kind: MeterKind): number | null {
  switch (kind) {
    case "webflowProxy":
      return policy.webflowProxyCap;
    case "cmsWrite":
      return policy.cmsWriteCap;
    case "image":
      return policy.imageCap;
  }
}

/** Tier default cap for progress bar scale when metering is skipped (`limit` is null). */
export function referenceCapForMeterKind(tier: TowerTier, kind: MeterKind, limits: TowerLimitsSnapshot): number {
  return tierDefaultCap(kind, tier, limits);
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
  webflowProxyLimitOverride: null,
  cmsWriteLimitOverride: null,
  imageOptimizeLimitOverride: null,
};

export type TowerUsageLimitsKind = "standard" | "custom" | "unmetered";

export function hasMeteringLimitOverrides(
  user: MeteringOverrideFields,
  organization: MeteringOverrideFields | null
): boolean {
  const scopes = organization === null ? [user] : [user, organization];
  return scopes.some(
    (fields) =>
      fields.webflowProxyLimitOverride !== null ||
      fields.cmsWriteLimitOverride !== null ||
      fields.imageOptimizeLimitOverride !== null
  );
}

/** End-user billing UI: standard tier caps, custom operator caps, or unmetered. */
export function resolveUsageLimitsKind(
  policy: Pick<MeteringPolicy, "skipMetering">,
  user: MeteringOverrideFields,
  organization: MeteringOverrideFields | null
): TowerUsageLimitsKind {
  if (policy.skipMetering) {
    return "unmetered";
  }
  if (hasMeteringLimitOverrides(user, organization)) {
    return "custom";
  }
  return "standard";
}
