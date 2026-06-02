import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import {
  buildTowerUsageDesignerApiBreakdown,
  buildTowerUsageMeterSnapshot,
  hasTowerUsageDesignerApiBreakdown,
  pickApproachingUsageMeters,
  towerPlanBillingScope,
  towerPlanName,
} from "@codalyn/webflow-kit";
import { cache } from "react";
import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import {
  capForMeterKind,
  EMPTY_METERING_OVERRIDES,
  referenceCapForMeterKind,
  resolveMeteringPolicyFromEntitlement,
  resolveUsageLimitsKind,
} from "@/server/billing/metering-policy";
import { getTowerLimitsSnapshot } from "@/server/billing/tower-limits-config";
import { getUsageSnapshotForScope, loadMeteringOverrideFields, resolveUsageScope } from "@/server/billing/usage-gate";

/**
 * Request-memoized via `cache()`: the Tower layout banner, dashboard, and billing page all read the
 * same snapshot for one render, so this resolves once per (user, active workspace) instead of per call.
 */
export const fetchEndUserUsageStatus = cache(async function fetchEndUserUsageStatus(
  userId: string,
  activeOrganizationId: string | null
): Promise<TowerUsageStatusSnapshot> {
  const overrides = await loadMeteringOverrideFields(userId, activeOrganizationId);
  const entitlement = await resolveTowerEntitlement(userId, activeOrganizationId);
  const limits = await getTowerLimitsSnapshot();
  const policy = resolveMeteringPolicyFromEntitlement(entitlement, overrides.user, overrides.organization, limits, {
    billingScope: towerPlanBillingScope(entitlement.tier),
    paidSeatCount: overrides.paidSeatCount,
  });
  const scope = resolveUsageScope(entitlement.tier, userId, activeOrganizationId);
  const usage = await getUsageSnapshotForScope(scope);

  const meters = [
    buildTowerUsageMeterSnapshot(
      "webflowProxy",
      usage.webflowProxyRequestCount,
      capForMeterKind(policy, "webflowProxy"),
      referenceCapForMeterKind(policy.tier, "webflowProxy", limits, policy.paidSeatCount)
    ),
    buildTowerUsageMeterSnapshot(
      "cmsWrite",
      usage.cmsWriteCount,
      capForMeterKind(policy, "cmsWrite"),
      referenceCapForMeterKind(policy.tier, "cmsWrite", limits, policy.paidSeatCount)
    ),
    buildTowerUsageMeterSnapshot(
      "image",
      usage.imageOptimizeCount,
      capForMeterKind(policy, "image"),
      referenceCapForMeterKind(policy.tier, "image", limits, policy.paidSeatCount)
    ),
  ];

  const designerApiBreakdown = buildTowerUsageDesignerApiBreakdown(
    usage.webflowProxyCmsSlotsCount,
    usage.webflowProxyImageUploadCmsCount
  );

  return {
    yearMonth: usage.yearMonth,
    tier: entitlement.tier,
    plan: {
      key: entitlement.tier,
      name: towerPlanName(entitlement.tier),
      billingScope: towerPlanBillingScope(entitlement.tier),
    },
    usageScope: policy.usageScope,
    pooledSeatCount: policy.usageScope === "workspace" ? policy.paidSeatCount : null,
    // Pooled (workspace) caps ignore per-member user overrides, so they must not flag "custom" limits.
    limitsKind: resolveUsageLimitsKind(
      policy,
      policy.usageScope === "workspace" ? EMPTY_METERING_OVERRIDES : overrides.user,
      overrides.organization
    ),
    metered: !policy.skipMetering,
    meters,
    approachingMeters: pickApproachingUsageMeters(meters),
    designerApiBreakdown: hasTowerUsageDesignerApiBreakdown(designerApiBreakdown) ? designerApiBreakdown : null,
  };
});
