import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { buildTowerUsageMeterSnapshot, pickApproachingUsageMeters } from "@codalyn/webflow-kit";
import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import {
  capForMeterKind,
  referenceCapForMeterKind,
  resolveMeteringPolicyFromEntitlement,
  resolveUsageLimitsKind,
} from "@/server/billing/metering-policy";
import { getTowerLimitsSnapshot } from "@/server/billing/tower-limits-config";
import { getUsageSnapshot, loadMeteringOverrideFields } from "@/server/billing/usage-gate";

export async function fetchEndUserUsageStatus(
  userId: string,
  activeOrganizationId: string | null
): Promise<TowerUsageStatusSnapshot> {
  const overrides = await loadMeteringOverrideFields(userId, activeOrganizationId);
  const entitlement = await resolveTowerEntitlement(userId, activeOrganizationId);
  const usage = await getUsageSnapshot(userId);
  const limits = await getTowerLimitsSnapshot();
  const policy = resolveMeteringPolicyFromEntitlement(entitlement, overrides.user, overrides.organization, limits);

  const meters = [
    buildTowerUsageMeterSnapshot(
      "webflowProxy",
      usage.webflowProxyRequestCount,
      capForMeterKind(policy, "webflowProxy"),
      referenceCapForMeterKind(policy.tier, "webflowProxy", limits)
    ),
    buildTowerUsageMeterSnapshot(
      "cmsWrite",
      usage.cmsWriteCount,
      capForMeterKind(policy, "cmsWrite"),
      referenceCapForMeterKind(policy.tier, "cmsWrite", limits)
    ),
    buildTowerUsageMeterSnapshot(
      "image",
      usage.imageOptimizeCount,
      capForMeterKind(policy, "image"),
      referenceCapForMeterKind(policy.tier, "image", limits)
    ),
  ];

  return {
    yearMonth: usage.yearMonth,
    tier: entitlement.tier,
    limitsKind: resolveUsageLimitsKind(policy, overrides.user, overrides.organization),
    metered: !policy.skipMetering,
    meters,
    approachingMeters: pickApproachingUsageMeters(meters),
  };
}
