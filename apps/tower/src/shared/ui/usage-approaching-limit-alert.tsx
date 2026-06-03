import type { TowerUsageMeterKind, TowerUsageScope } from "@codalyn/webflow-kit";
import {
  TOWER_USAGE_APPROACHING_ALERT_TITLE,
  TOWER_USAGE_LIMIT_RESET_LABEL,
  towerUsageApproachingAlertDescription,
  towerUsageLimitResetDetailLine,
} from "@codalyn/webflow-kit";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { UsageApproachingLimitMeterLine } from "@/shared/ui/usage-approaching-limit-meter-line";

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

  // Meters are rendered once as their own rows below, so the lead line stays scope-only
  // (the empty-meters copy) to avoid repeating each ratio in prose.
  const scopeDescription = towerUsageApproachingAlertDescription([], usageScope);

  const lastMeterIndex = meters.length - 1;

  return (
    <Alert variant="warning">
      <IconAlertTriangle aria-hidden />
      <AlertTitle>{TOWER_USAGE_APPROACHING_ALERT_TITLE}</AlertTitle>
      <AlertDescription>
        <div className="grid gap-2">
          <div>{scopeDescription}</div>
          <ul className="grid gap-1">
            {meters.map((meter, index) => (
              <li key={meter.kind}>
                <UsageApproachingLimitMeterLine
                  kind={meter.kind}
                  used={meter.used}
                  limit={meter.limit}
                  trailingAction={index === lastMeterIndex ? upgradeAction : undefined}
                />
              </li>
            ))}
          </ul>
          <div className="text-muted-foreground/80 text-xs">
            {TOWER_USAGE_LIMIT_RESET_LABEL} {towerUsageLimitResetDetailLine()}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
