import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { beaconAppRouteSurfaceClass } from "@/shared/lib/beacon-app-route-surface";
import { cn } from "@/shared/lib/utils";

/** Canonical layout surfaces for Beacon route loading chrome (shell, overlay, full-route). */
export const routeLoadingSurfaceVariants = cva("flex flex-col items-center justify-center", {
  variants: {
    layout: {
      /** In-scroll loader that grows to fill the route viewport. */
      shell: "min-h-0 min-w-0 flex-1 py-4",
      /** Full-bleed loader over a `relative` route scroll region. */
      overlay: "absolute inset-0 z-20 bg-background/85 backdrop-blur-[1px]",
      /** Full-height route surface (e.g. access gates without route chrome). */
      route: cn(beaconAppRouteSurfaceClass, "gap-3 p-6"),
    },
  },
  defaultVariants: {
    layout: "shell",
  },
});

export type RouteLoadingSurfaceProps = React.ComponentProps<"div"> &
  VariantProps<typeof routeLoadingSurfaceVariants>;

export function RouteLoadingSurface(props: RouteLoadingSurfaceProps) {
  const { layout, className, ...rest } = props;
  return (
    <div data-slot="route_loading_surface" className={cn(routeLoadingSurfaceVariants({ layout }), className)} {...rest} />
  );
}
