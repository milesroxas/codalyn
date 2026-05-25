import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { buildTowerUsageMeterSnapshot, pickApproachingUsageMeters } from "@codalyn/webflow-kit";
import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import { capForMeterKind, resolveMeteringPolicyFromEntitlement } from "@/server/billing/metering-policy";
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

  if (policy.skipMetering) {
    return {
      yearMonth: usage.yearMonth,
      tier: entitlement.tier,
      metered: false,
      meters: [],
      approachingMeters: [],
    };
  }

  const meters = [
    buildTowerUsageMeterSnapshot(
      "webflowProxy",
      usage.webflowProxyRequestCount,
      capForMeterKind(policy, "webflowProxy")
    ),
    buildTowerUsageMeterSnapshot("cmsWrite", usage.cmsWriteCount, capForMeterKind(policy, "cmsWrite")),
    buildTowerUsageMeterSnapshot("image", usage.imageOptimizeCount, capForMeterKind(policy, "image")),
  ];

  return {
    yearMonth: usage.yearMonth,
    tier: entitlement.tier,
    metered: true,
    meters,
    approachingMeters: pickApproachingUsageMeters(meters),
  };
}
