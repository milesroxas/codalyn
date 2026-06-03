import type { TowerUsageMeterKind, TowerUsageScope } from "@codalyn/webflow-kit";

const STORAGE_PREFIX = "tower.usage-approaching-alert.dismissed";

export function towerUsageApproachingAlertDismissStorageKey(
  meters: ReadonlyArray<{ kind: TowerUsageMeterKind; used: number; limit: number }>,
  usageScope: TowerUsageScope
): string {
  const meterKey = meters.map((meter) => `${meter.kind}:${meter.used}:${meter.limit}`).join("|");
  return `${STORAGE_PREFIX}.${usageScope}.${meterKey}`;
}
