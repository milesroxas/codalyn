import type { TowerUsageMeterKind, TowerUsageScope } from "@codalyn/webflow-kit";
import {
  formatTowerUsageRatio,
  TOWER_USAGE_APPROACHING_ALERT_TITLE,
  towerUsageApproachingAlertDescription,
} from "@codalyn/webflow-kit";
import { UsageMeterLabel } from "@codalyn/webflow-kit/react";
import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/shared/ui/alert";

type UsageApproachingLimitAlertProps = {
  meters: ReadonlyArray<{ kind: TowerUsageMeterKind; used: number; limit: number }>;
  usageScope?: TowerUsageScope;
  upgradeAction?: ReactNode;
};

export function UsageApproachingLimitAlert(props: UsageApproachingLimitAlertProps) {
  const { meters, usageScope = "user", upgradeAction } = props;
  if (meters.length === 0) {
    return null;
  }

  return (
    <Alert variant="warning">
      <TriangleAlert aria-hidden />
      <AlertTitle>{TOWER_USAGE_APPROACHING_ALERT_TITLE}</AlertTitle>
      <AlertDescription>
        <p>{towerUsageApproachingAlertDescription(meters, usageScope)}</p>
        <ul>
          {meters.map((meter) => (
            <li key={meter.kind}>
              <UsageMeterLabel kind={meter.kind} />: {formatTowerUsageRatio(meter.used, meter.limit)}
            </li>
          ))}
        </ul>
      </AlertDescription>
      {upgradeAction ? <AlertAction>{upgradeAction}</AlertAction> : null}
    </Alert>
  );
}
