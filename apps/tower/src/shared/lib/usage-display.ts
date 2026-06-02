import { formatTowerUsageRatio, type TowerUsageLimitsKind, towerPlanName } from "@codalyn/webflow-kit";
import type { TowerTier } from "@/server/billing/entitlements";

export type TowerUsageTier = TowerTier;

export type TowerEntitlementLike = {
  tier: TowerUsageTier;
  source: "none" | "user_stripe" | "workspace_team";
};

/** Formats monthly usage for tables and detail panels. `limit === null` means unlimited. */
export function formatUsageRatio(used: number, limit: number | null): string {
  return formatTowerUsageRatio(used, limit);
}

export function usageTierLabel(tier: TowerUsageTier): string {
  return towerPlanName(tier);
}

export function usageLimitsPlanLabel(tier: TowerUsageTier): string {
  return `${usageTierLabel(tier)} limits`;
}

/** Short tier label for usage meter cards (follows active workspace). */
export function usagePlanBadgeLabel(tier: TowerUsageTier): string {
  return `${usageTierLabel(tier)} plan`;
}

export function meteringStatusLabel(opts: {
  meteringEnabled: boolean;
  globalMeteringDisabled: boolean;
  tier: TowerUsageTier;
}): string {
  if (opts.globalMeteringDisabled || !opts.meteringEnabled) {
    return "Unmetered";
  }
  return "Metered";
}

/** Individual Stripe subscription (Pro or Studio) on the signed-in user (`user` row), not workspace Team billing. */
export function accountSubscriptionPlanLabel(entitlement: TowerEntitlementLike): string {
  return entitlement.source === "user_stripe" ? usageTierLabel(entitlement.tier) : "Free";
}

/** Active-workspace usage tier label (what limits apply this month). */
export function activeUsageTierLabel(entitlement: TowerEntitlementLike): string {
  return usageTierLabel(entitlement.tier);
}

/** Secondary badge on billing/usage when operator caps differ from the standard tier defaults. */
export function usageLimitsKindBadgeLabel(limitsKind: TowerUsageLimitsKind, tier: TowerUsageTier): string | null {
  if (limitsKind === "custom") {
    return "Custom limits";
  }
  if (tier === "free" && limitsKind === "unmetered") {
    return "Custom plan";
  }
  return null;
}

export function usageLimitsKindDetailLine(limitsKind: TowerUsageLimitsKind, tier: TowerUsageTier): string | null {
  if (limitsKind === "custom") {
    return "Your monthly usage caps differ from the standard plan defaults.";
  }
  if (tier === "free" && limitsKind === "unmetered") {
    return "Monthly usage limits are not applied to your account.";
  }
  return null;
}
