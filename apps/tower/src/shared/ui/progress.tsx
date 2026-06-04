"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Progress as ProgressPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

const progressIndicatorVariants = cva("size-full flex-1 transition-all", {
  variants: {
    indicatorLevel: {
      ok: "bg-primary",
      approaching: "bg-chart-4",
      exceeded: "bg-destructive",
      unmetered: "bg-muted-foreground",
    },
  },
  defaultVariants: {
    indicatorLevel: "ok",
  },
});

export type ProgressIndicatorLevel = NonNullable<VariantProps<typeof progressIndicatorVariants>["indicatorLevel"]>;

function Progress({
  className,
  value,
  indicatorLevel = "ok",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & VariantProps<typeof progressIndicatorVariants>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("relative flex h-1.5 w-full items-center overflow-x-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(progressIndicatorVariants({ indicatorLevel }))}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
