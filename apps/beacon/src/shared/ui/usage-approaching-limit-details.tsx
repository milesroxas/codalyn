import type { TowerUsageMeterKind, TowerUsageScope } from "@codalyn/webflow-kit";
import {
  formatTowerUsageRatio,
  TOWER_USAGE_LIMIT_RESET_LABEL,
  towerUsageApproachingAlertDescription,
  towerUsageLimitResetDetailLine,
} from "@codalyn/webflow-kit";
import { UsageMeterLabel } from "@codalyn/webflow-kit/react";

export type UsageApproachingLimitMeter = {
  kind: TowerUsageMeterKind;
  used: number;
  limit: number;
};

type UsageApproachingLimitDetailsProps = {
  meters: ReadonlyArray<UsageApproachingLimitMeter>;
  usageScope?: TowerUsageScope;
};

export function UsageApproachingLimitDetails(props: UsageApproachingLimitDetailsProps) {
  const { meters, usageScope = "user" } = props;
  if (meters.length === 0) {
    return null;
  }

  const scopeDescription = towerUsageApproachingAlertDescription([], usageScope);

  return (
    <div className="grid gap-2">
      <div>{scopeDescription}</div>
      <ul className="grid gap-1">
        {meters.map((meter) => (
          <li key={meter.kind} className="flex items-center justify-between gap-3">
            <UsageMeterLabel kind={meter.kind} />
            <span className="shrink-0 font-medium text-foreground tabular-nums">
              {formatTowerUsageRatio(meter.used, meter.limit)}
            </span>
          </li>
        ))}
      </ul>
      <div className="text-muted-foreground/80 text-xs">
        {TOWER_USAGE_LIMIT_RESET_LABEL} {towerUsageLimitResetDetailLine()}
      </div>
    </div>
  );
}
