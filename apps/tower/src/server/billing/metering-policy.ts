import type { TowerPlanBillingScope } from "@codalyn/webflow-kit";
import type { TowerEntitlement, TowerTier } from "@/server/billing/entitlements";
import type { TowerLimitsSnapshot, TowerTierLimits } from "@/server/billing/tower-limits-config";
import { isGlobalMeteringDisabled, tierLimitsFromSnapshot } from "@/server/billing/tower-limits-config";

export type MeterKind = "webflowProxy" | "cmsWrite" | "image";

/** Where a monthly meter is keyed and enforced: per individual user, or pooled across a paid workspace. */
export type TowerUsageScopeKind = "user" | "workspace";

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
  /** Defaults to `user`. `workspace` pools the cap across paid seats (Team). */
  billingScope?: TowerPlanBillingScope;
  /** Paid seats backing a pooled (`workspace`) cap. Ignored for `user` scope. Defaults to 1. */
  paidSeatCount?: number;
};

export type MeteringPolicy = {
  skipMetering: boolean;
  webflowProxyCap: number | null;
  cmsWriteCap: number | null;
  imageCap: number | null;
  tier: TowerTier;
  globalMeteringDisabled: boolean;
  /** `workspace` when the resolved caps are pooled across the active paid Team workspace. */
  usageScope: TowerUsageScopeKind;
  /** Paid seats applied to pooled caps (1 for user scope). */
  paidSeatCount: number;
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

function resolveUserScopeCap(
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

/**
 * Pooled (Team) cap: an operator override on the workspace is treated as the absolute pool cap; otherwise
 * the per-seat tier default is multiplied by paid seats. Individual (per-user) overrides do not apply to a
 * shared pool.
 */
function resolveWorkspaceScopeCap(
  kind: MeterKind,
  tier: TowerTier,
  organization: MeteringOverrideFields | null,
  paidSeatCount: number,
  limits: TowerLimitsSnapshot
): number | null {
  const orgOverride = organization === null ? null : overrideField(organization, kind);
  if (orgOverride !== null) {
    return orgOverride;
  }
  const perSeatCap = tierDefaultCap(kind, tier, limits);
  return perSeatCap * Math.max(1, Math.trunc(paidSeatCount));
}

function resolveCap(
  kind: MeterKind,
  input: MeteringPolicyInput,
  usageScope: TowerUsageScopeKind,
  paidSeatCount: number
): number | null {
  if (usageScope === "workspace") {
    return resolveWorkspaceScopeCap(kind, input.tier, input.organization, paidSeatCount, input.limits);
  }
  return resolveUserScopeCap(kind, input.tier, input.user, input.organization, input.limits);
}

export function resolveMeteringPolicy(input: MeteringPolicyInput): MeteringPolicy {
  const globalMeteringDisabled = isGlobalMeteringDisabled(input.limits);
  const usageScope: TowerUsageScopeKind = input.billingScope === "workspace" ? "workspace" : "user";
  const paidSeatCount = usageScope === "workspace" ? Math.max(1, Math.trunc(input.paidSeatCount ?? 1)) : 1;

  // Pooled (workspace) metering is governed by the workspace toggle; per-member toggles are individual.
  const skipMetering =
    globalMeteringDisabled ||
    (usageScope === "workspace"
      ? input.organization !== null && !input.organization.meteringEnabled
      : !input.user.meteringEnabled || (input.organization !== null && !input.organization.meteringEnabled));

  return {
    skipMetering,
    webflowProxyCap: skipMetering ? null : resolveCap("webflowProxy", input, usageScope, paidSeatCount),
    cmsWriteCap: skipMetering ? null : resolveCap("cmsWrite", input, usageScope, paidSeatCount),
    imageCap: skipMetering ? null : resolveCap("image", input, usageScope, paidSeatCount),
    tier: input.tier,
    globalMeteringDisabled,
    usageScope,
    paidSeatCount,
  };
}

export function resolveMeteringPolicyFromEntitlement(
  entitlement: TowerEntitlement,
  user: MeteringOverrideFields,
  organization: MeteringOverrideFields | null,
  limits: TowerLimitsSnapshot,
  opts?: { billingScope?: TowerPlanBillingScope; paidSeatCount?: number }
): MeteringPolicy {
  return resolveMeteringPolicy({
    tier: entitlement.tier,
    user,
    organization,
    limits,
    billingScope: opts?.billingScope,
    paidSeatCount: opts?.paidSeatCount,
  });
}

export type ReservationDecision = { blocked: boolean; used: number };

/**
 * Pure reservation decision for a monthly meter: reserve `units` (≥1) only when the whole amount
 * fits under `cap`. A single request whose cost exceeds the remaining allowance is blocked (we never
 * partially reserve). Returns the post-reserve `used` count, or the unchanged count when blocked.
 */
export function reserveUnits(current: number, cap: number, units: number): ReservationDecision {
  const amount = Math.max(1, Math.trunc(units));
  if (current + amount > cap) {
    return { blocked: true, used: current };
  }
  return { blocked: false, used: current + amount };
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

/**
 * Tier default cap for progress bar scale when metering is skipped (`limit` is null). For pooled
 * (workspace) scope, the reference is multiplied by paid seats to match the enforced pool size.
 */
export function referenceCapForMeterKind(
  tier: TowerTier,
  kind: MeterKind,
  limits: TowerLimitsSnapshot,
  paidSeatCount = 1
): number {
  return tierDefaultCap(kind, tier, limits) * Math.max(1, Math.trunc(paidSeatCount));
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
