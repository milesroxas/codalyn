"use client";

import { type TowerUsageMeterKind, towerUsageMeterLabel, towerUsageMeterTooltip } from "@codalyn/webflow-kit";
import { IconInfoCircle } from "@tabler/icons-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

type UsageMeterLabelProps = {
  kind: TowerUsageMeterKind;
  label?: string;
};

export function UsageMeterLabel({ kind, label }: UsageMeterLabelProps) {
  const displayLabel = label ?? towerUsageMeterLabel(kind);
  const tooltip = towerUsageMeterTooltip(kind);

  return (
    <span className="inline-flex items-center gap-1">
      <span>{displayLabel}</span>
      <Tooltip>
        <TooltipTrigger
          type="button"
          tabIndex={0}
          aria-label={`About ${displayLabel}`}
          aria-describedby={undefined}
          className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-sm text-muted-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <IconInfoCircle aria-hidden className="size-3.5" stroke={1.5} />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[300px] whitespace-pre-line text-left leading-snug font-normal">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
