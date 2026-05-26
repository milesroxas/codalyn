import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

const floatingActionButtonAnchorVariants = cva("pointer-events-none fixed z-40 flex", {
  variants: {
    placement: {
      "screen-end": "bottom-4 right-4 md:bottom-6 md:right-6",
    },
  },
  defaultVariants: {
    placement: "screen-end",
  },
});

function FloatingActionButtonAnchor({
  className,
  placement = "screen-end",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof floatingActionButtonAnchorVariants>) {
  return (
    <div
      data-slot="floating-action-button-anchor"
      className={cn(floatingActionButtonAnchorVariants({ placement }), className)}
      {...props}
    />
  );
}

function FloatingActionButtonSlot({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="floating-action-button-slot" className={cn("pointer-events-auto", className)} {...props} />;
}

export { FloatingActionButtonAnchor, FloatingActionButtonSlot };
