import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { TOWER_PUBLIC_FOOTER_HEIGHT_PX } from "@/shared/ui/tower-public-footer";

const floatingActionButtonAnchorVariants = cva("pointer-events-none fixed z-50 flex", {
  variants: {
    placement: {
      "screen-end": "bottom-4 right-4 md:bottom-6 md:right-6",
      "screen-end-above-public-footer": "right-4 md:right-6",
    },
  },
  defaultVariants: {
    placement: "screen-end",
  },
});

function floatingActionButtonAnchorStyle(
  placement: "screen-end" | "screen-end-above-public-footer"
): React.CSSProperties | undefined {
  if (placement !== "screen-end-above-public-footer") {
    return undefined;
  }

  return {
    bottom: `calc(${TOWER_PUBLIC_FOOTER_HEIGHT_PX}px + 1rem)`,
  };
}

function FloatingActionButtonAnchor({
  className,
  placement = "screen-end",
  style,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof floatingActionButtonAnchorVariants>) {
  const resolvedPlacement = placement ?? "screen-end";

  return (
    <div
      data-slot="floating-action-button-anchor"
      className={cn(floatingActionButtonAnchorVariants({ placement: resolvedPlacement }), className)}
      style={{ ...floatingActionButtonAnchorStyle(resolvedPlacement), ...style }}
      {...props}
    />
  );
}

function FloatingActionButtonSlot({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="floating-action-button-slot" className={cn("pointer-events-auto", className)} {...props} />;
}

export { FloatingActionButtonAnchor, FloatingActionButtonSlot };
