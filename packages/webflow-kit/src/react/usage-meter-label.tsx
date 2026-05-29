"use client";

import { IconInfoCircle } from "@tabler/icons-react";
import { cva } from "class-variance-authority";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { TowerUsageMeterKind } from "../tower/tower-usage-metering.js";
import { towerUsageMeterLabel } from "../tower/tower-usage-metering-copy.js";
import { UsageMeterTooltipDetail } from "./usage-meter-tooltip-detail.js";
import { USAGE_METER_TOOLTIP_COLLISION_PADDING, usageMeterTooltipMaxWidthClass } from "./usage-meter-tooltip-shell.js";

export type UsageMeterLabelProps = {
  kind: TowerUsageMeterKind;
  label?: string;
};

export const usageMeterTooltipSurfaceVariants = cva(
  [
    "z-50 w-fit",
    usageMeterTooltipMaxWidthClass,
    "origin-(--radix-tooltip-content-transform-origin) rounded-lg border border-background/10 bg-foreground px-3 py-2.5 text-xs text-background shadow-md",
    "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
    "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  ].join(" ")
);

export function UsageMeterLabel({ kind, label }: UsageMeterLabelProps) {
  const displayLabel = label ?? towerUsageMeterLabel(kind);

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
              collisionPadding={USAGE_METER_TOOLTIP_COLLISION_PADDING}
              className={usageMeterTooltipSurfaceVariants()}
            >
              <UsageMeterTooltipDetail kind={kind} />
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    </span>
  );
}
