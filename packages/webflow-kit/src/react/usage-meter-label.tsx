"use client";

import { IconInfoCircle } from "@tabler/icons-react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { TowerUsageMeterKind } from "../tower/tower-usage-metering.js";
import { towerUsageMeterLabel, towerUsageMeterTooltip } from "../tower/tower-usage-metering-copy.js";

export type UsageMeterLabelProps = {
  kind: TowerUsageMeterKind;
  label?: string;
};

export function UsageMeterLabel({ kind, label }: UsageMeterLabelProps) {
  const displayLabel = label ?? towerUsageMeterLabel(kind);
  const tooltip = towerUsageMeterTooltip(kind);

  return (
    <span className="inline-flex items-center gap-1">
      <span>{displayLabel}</span>
      <TooltipPrimitive.Provider delayDuration={150}>
        <TooltipPrimitive.Root>
          <TooltipPrimitive.Trigger
            type="button"
            tabIndex={0}
            aria-label={`About ${displayLabel}`}
            className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-sm text-muted-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <IconInfoCircle aria-hidden className="size-3.5" stroke={1.5} />
          </TooltipPrimitive.Trigger>
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
              side="top"
              sideOffset={6}
              className="z-50 max-w-[300px] origin-(--radix-tooltip-content-transform-origin) rounded-md bg-foreground px-2 py-1 text-left text-xs leading-snug font-normal whitespace-pre-line text-background data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            >
              {tooltip}
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    </span>
  );
}
