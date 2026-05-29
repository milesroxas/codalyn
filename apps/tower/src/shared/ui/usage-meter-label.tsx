"use client";

import { type TowerUsageMeterKind, towerUsageMeterLabel } from "@codalyn/webflow-kit";
import { UsageMeterTooltipDetail } from "@codalyn/webflow-kit/react";
import { Tooltip, TooltipContent, TooltipHelpTrigger } from "@/shared/ui/tooltip";

export type UsageMeterLabelProps = {
  kind: TowerUsageMeterKind;
  label?: string;
};

export function UsageMeterLabel({ kind, label }: UsageMeterLabelProps) {
  const displayLabel = label ?? towerUsageMeterLabel(kind);

  return (
    <span className="inline-flex items-center gap-1">
      <span>{displayLabel}</span>
      <Tooltip>
        <TooltipHelpTrigger label={`About ${displayLabel}`} />
        <TooltipContent side="top" variant="usageMeter">
          <UsageMeterTooltipDetail kind={kind} />
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
