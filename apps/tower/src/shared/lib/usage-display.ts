import { formatTowerUsageRatio, type TowerUsageLimitsKind } from "@codalyn/webflow-kit";

/** Formats monthly usage for tables and detail panels. `limit === null` means unlimited. */
export function formatUsageRatio(used: number, limit: number | null): string {
  return formatTowerUsageRatio(used, limit);
}

export function meteringStatusLabel(opts: {
  meteringEnabled: boolean;
  globalMeteringDisabled: boolean;
  tier: "free" | "pro";
}): string {
  if (opts.globalMeteringDisabled || !opts.meteringEnabled || opts.tier === "pro") {
    return "Unmetered";
  }
  return "Metered";
}

export function usageTierBadgeLabel(tier: "free" | "pro"): string {
  return tier === "pro" ? "Pro" : "Free";
}

/** End-user billing label: distinguishes individual Pro from workspace Team entitlements. */
export function billingAccountPlanLabel(entitlement: {
  tier: "free" | "pro";
  source: "user_stripe" | "organization" | "none";
}): string {
  if (entitlement.source === "user_stripe") {
    return "Pro";
  }
  if (entitlement.source === "organization") {
    return "Team";
  }
  return usageTierBadgeLabel(entitlement.tier);
}

/** Secondary badge on billing/usage when operator caps differ from the standard tier defaults. */
export function usageLimitsKindBadgeLabel(limitsKind: TowerUsageLimitsKind, tier: "free" | "pro"): string | null {
  if (limitsKind === "custom") {
    return "Custom limits";
  }
  if (tier === "free" && limitsKind === "unmetered") {
    return "Custom plan";
  }
  return null;
}

export function usageLimitsKindDetailLine(limitsKind: TowerUsageLimitsKind, tier: "free" | "pro"): string | null {
  if (limitsKind === "custom") {
    return "Your monthly usage caps differ from the standard plan defaults.";
  }
  if (tier === "free" && limitsKind === "unmetered") {
    return "Monthly usage limits are not applied to your account.";
  }
  return null;
}
