"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Progress as ProgressPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

const progressTrackClass = "relative flex h-1.5 w-full items-center overflow-x-hidden rounded-full bg-muted";

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

const progressIndeterminateIndicatorClass =
  "bg-primary absolute inset-y-0 w-1/3 rounded-full motion-safe:animate-[progress-indeterminate_1.4s_ease-in-out_infinite] motion-reduce:static motion-reduce:w-full motion-reduce:opacity-60";

export type ProgressIndicatorLevel = NonNullable<VariantProps<typeof progressIndicatorVariants>["indicatorLevel"]>;

function Progress({
  className,
  value,
  indeterminate = false,
  indicatorLevel = "ok",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> &
  VariantProps<typeof progressIndicatorVariants> & {
    indeterminate?: boolean;
  }) {
  if (indeterminate) {
    return (
      <ProgressPrimitive.Root
        data-slot="progress"
        data-indeterminate="true"
        className={cn(progressTrackClass, className)}
        {...props}
      >
        <ProgressPrimitive.Indicator data-slot="progress-indicator" className={progressIndeterminateIndicatorClass} />
      </ProgressPrimitive.Root>
    );
  }

  return (
    <ProgressPrimitive.Root data-slot="progress" className={cn(progressTrackClass, className)} {...props}>
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(progressIndicatorVariants({ indicatorLevel }))}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
