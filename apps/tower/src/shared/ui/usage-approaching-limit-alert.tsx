import type { TowerUsageMeterKind } from "@codalyn/webflow-kit";
import {
  formatTowerUsageRatio,
  TOWER_USAGE_APPROACHING_ALERT_TITLE,
  towerUsageApproachingAlertDescription,
} from "@codalyn/webflow-kit";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { UsageMeterLabel } from "@/shared/ui/usage-meter-label";

type UsageApproachingLimitAlertProps = {
  meters: ReadonlyArray<{ kind: TowerUsageMeterKind; used: number; limit: number }>;
  upgradeAction?: ReactNode;
};

export function UsageApproachingLimitAlert(props: UsageApproachingLimitAlertProps) {
  const { meters, upgradeAction } = props;
  if (meters.length === 0) {
    return null;
  }

  return (
    <Alert variant="warning">
      <IconAlertTriangle aria-hidden />
      <AlertTitle>{TOWER_USAGE_APPROACHING_ALERT_TITLE}</AlertTitle>
      <AlertDescription>
        <p>{towerUsageApproachingAlertDescription(meters)}</p>
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
