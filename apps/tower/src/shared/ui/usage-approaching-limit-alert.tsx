import type { TowerUsageMeterKind, TowerUsageScope } from "@codalyn/webflow-kit";
import { TOWER_USAGE_APPROACHING_ALERT_TITLE, towerUsageApproachingAlertDescription } from "@codalyn/webflow-kit";
import { IconAlertTriangle } from "@tabler/icons-react";
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
    <Alert variant="approaching">
      <IconAlertTriangle aria-hidden />
      <AlertTitle>{TOWER_USAGE_APPROACHING_ALERT_TITLE}</AlertTitle>
      <AlertDescription>{towerUsageApproachingAlertDescription(meters, usageScope)}</AlertDescription>
      {upgradeAction ? <AlertAction>{upgradeAction}</AlertAction> : null}
    </Alert>
  );
}
