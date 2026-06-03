import type { TowerUsageMeterKind } from "@codalyn/webflow-kit";
import { formatTowerUsageRatio } from "@codalyn/webflow-kit";
import type { ReactNode } from "react";
import { UsageMeterLabel } from "@/shared/ui/usage-meter-label";

type UsageApproachingLimitMeterLineProps = {
  kind: TowerUsageMeterKind;
  used: number;
  limit: number;
  trailingAction?: ReactNode;
};

export function UsageApproachingLimitMeterLine(props: UsageApproachingLimitMeterLineProps) {
  const { kind, used, limit, trailingAction } = props;

  return (
    <div
      data-slot="usage-approaching-limit-meter-line"
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-4"
    >
      <UsageMeterLabel kind={kind} />
      <span className="shrink-0 font-medium leading-none text-foreground tabular-nums">
        {formatTowerUsageRatio(used, limit)}
      </span>
      {trailingAction ? <div className="flex shrink-0 justify-end sm:justify-start">{trailingAction}</div> : null}
    </div>
  );
}
