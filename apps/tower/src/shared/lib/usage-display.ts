import { formatTowerUsageRatio, type TowerUsageLimitsKind } from "@codalyn/webflow-kit";
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
  switch (tier) {
    case "pro":
      return "Pro";
    case "team":
      return "Team";
    default:
      return "Free";
  }
}

export function usageLimitsPlanLabel(tier: TowerUsageTier): string {
  return `${usageTierLabel(tier)} limits`;
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

/** @deprecated Use {@link usageTierLabel}. */
export function usageTierBadgeLabel(tier: TowerUsageTier): string {
  return usageTierLabel(tier);
}

/** Individual Stripe Pro on the signed-in user (`user` row), not workspace Team billing. */
export function accountSubscriptionPlanLabel(entitlement: TowerEntitlementLike): "Free" | "Pro" {
  return entitlement.source === "user_stripe" ? "Pro" : "Free";
}

/** Active-workspace usage tier label (what limits apply this month). */
export function activeUsageTierLabel(entitlement: TowerEntitlementLike): string {
  return usageTierLabel(entitlement.tier);
}

/** Copy for `/billing` — account subscription vs active usage context. */
export function buildBillingPlanPresentation(entitlement: TowerEntitlementLike): {
  accountPlan: "Free" | "Pro";
  usageLimits: string;
  accountDetail: string | null;
  usageDetail: string | null;
} {
  const accountPlan = accountSubscriptionPlanLabel(entitlement);
  const usageLimits = usageLimitsPlanLabel(entitlement.tier);

  if (entitlement.tier === "team" && entitlement.source === "workspace_team") {
    return {
      accountPlan,
      usageLimits,
      accountDetail: "No individual Pro subscription on this account.",
      usageDetail:
        "Team limits apply while this paid workspace is active. Switch to your own workspace to use Free limits. Manage seats on the Team page.",
    };
  }

  if (entitlement.source === "user_stripe") {
    return {
      accountPlan,
      usageLimits,
      accountDetail: null,
      usageDetail:
        "Pro limits apply on your workspaces. While a paid Team workspace is active, that workspace uses Team limits instead.",
    };
  }

  return {
    accountPlan,
    usageLimits,
    accountDetail: null,
    usageDetail:
      entitlement.tier === "free"
        ? "Subscribe to Pro for higher limits and more workspaces you own. Add Team billing per workspace for seats and Team limits."
        : null,
  };
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
