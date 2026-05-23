import type { VariantProps } from "class-variance-authority";
import { ChevronLeft } from "lucide-react";
import type * as React from "react";
import type { ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  beaconAppRouteSurfaceClass,
  beaconPanelContainClass,
  beaconRouteBleedXClass,
  beaconRouteScrollContentClass,
} from "@/shared/lib/beacon-app-route-surface";
import { BEACON_BACK_TO_HOME_ARIA_LABEL } from "@/shared/lib/beacon-feature-route-copy";
import { cn } from "@/shared/lib/utils";
import { Button, type buttonVariants } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { hasBeaconRouteSubheaderContent } from "@/shared/ui/step-nav";

export type BeaconFeatureRouteHeaderProps = {
  title: string;
  onBack?: () => void;
  backAriaLabel?: string;
  dataSlot?: string;
};

export function BeaconFeatureRouteHeader(props: BeaconFeatureRouteHeaderProps) {
  const navigate = useNavigate();
  const {
    title,
    onBack,
    backAriaLabel = BEACON_BACK_TO_HOME_ARIA_LABEL,
    dataSlot = "beacon_feature_route_header",
  } = props;

  return (
    <div className="shrink-0 border-b border-border/50 bg-muted/20 dark:bg-muted/15" data-slot={dataSlot}>
      <div className={cn(beaconPanelContainClass, "flex h-8 items-center gap-2 px-3")}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="-ml-1 shrink-0 text-foreground"
          aria-label={backAriaLabel}
          onClick={() => void (onBack ? onBack() : navigate("/home"))}
        >
          <ChevronLeft aria-hidden className="size-4" strokeWidth={2.25} />
        </Button>
        <h2 className="min-w-0 truncate text-sm font-medium leading-none tracking-tight text-foreground">{title}</h2>
      </div>
    </div>
  );
}

export type BeaconFeatureRouteScrollBodyProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** When this value changes, the scroll viewport resets to the top (e.g. image editor flow step). */
  scrollResetKey?: string | number | boolean | null;
};

export function BeaconFeatureRouteScrollBody(props: BeaconFeatureRouteScrollBodyProps) {
  const { children, className, contentClassName, scrollResetKey } = props;
  const viewportRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollResetKey === undefined) {
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    viewport.scrollTop = 0;
  }, [scrollResetKey]);

  return (
    <div className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col", className)}>
      <ScrollArea className="h-full min-h-0 min-w-0 flex-1" viewportRef={viewportRef}>
        <div className={cn(beaconRouteScrollContentClass, contentClassName)}>{children}</div>
      </ScrollArea>
    </div>
  );
}

export type BeaconFeatureRouteFooterProps = React.ComponentProps<"footer"> & {
  children: ReactNode;
  dataSlot?: string;
};

export function BeaconFeatureRouteFooter(props: BeaconFeatureRouteFooterProps) {
  const { children, dataSlot = "beacon_feature_route_footer", className, ...footerProps } = props;
  return (
    <footer
      data-slot={dataSlot}
      className={cn(
        "mt-auto flex shrink-0 border-t border-border/65 bg-background px-3 pt-2 pb-[max(env(safe-area-inset-bottom,0px),0.375rem)]",
        className
      )}
      {...footerProps}
    >
      {children}
    </footer>
  );
}

export type BeaconFeatureRouteDockButtonProps = React.ComponentProps<typeof Button> &
  VariantProps<typeof buttonVariants> & {
    /** Grow to fill the footer row (e.g. Save, Continue). */
    stretch?: boolean;
    /** Primary dock action (`default`). When false, uses `secondary` (Save idle, Sync synced). */
    emphasized?: boolean;
  };

/** Footer dock action sizing shared by CMS Slots and Image Upload route footers. */
export function BeaconFeatureRouteDockButton(props: BeaconFeatureRouteDockButtonProps) {
  const { stretch, emphasized = true, className, size = "dockNav", variant, ...rest } = props;
  const resolvedVariant = variant ?? (emphasized ? "default" : "secondary");
  return (
    <Button variant={resolvedVariant} size={size} className={cn(stretch && "min-w-0 flex-1", className)} {...rest} />
  );
}

export type BeaconRouteSubheaderProps = {
  children: ReactNode;
};

/** In-scroll strip (e.g. loaded image filename + change control). */
export function BeaconRouteSubheader(props: BeaconRouteSubheaderProps) {
  const { children } = props;
  return (
    <div
      data-slot="beacon_route_subheader"
      className={cn(
        beaconPanelContainClass,
        beaconRouteBleedXClass,
        "flex min-h-0 items-center gap-2 border-b border-border bg-muted/40 py-1.5 pr-1.5"
      )}
    >
      {children}
    </div>
  );
}

export type BeaconFeatureRouteSubheaderProps = {
  children: ReactNode;
  dataSlot?: string;
};

/** Pinned strip directly under the route header (e.g. step breadcrumbs). Hidden when empty. */
export function BeaconFeatureRouteSubheader(props: BeaconFeatureRouteSubheaderProps) {
  const { children, dataSlot = "beacon_feature_route_subheader" } = props;
  if (!hasBeaconRouteSubheaderContent(children)) {
    return null;
  }
  return (
    <div className="shrink-0 border-b border-border/50 bg-background" data-slot={dataSlot}>
      <div className={cn(beaconPanelContainClass, "px-3 py-2")}>{children}</div>
    </div>
  );
}

export type BeaconFeatureRouteChromeProps = {
  header: ReactNode;
  subheader?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  overlays?: ReactNode;
  className?: string;
};

export function BeaconFeatureRouteChrome(props: BeaconFeatureRouteChromeProps) {
  const { header, subheader, children, footer, overlays, className } = props;
  return (
    <div className={cn(beaconAppRouteSurfaceClass, className)}>
      {header}
      {subheader}
      {children}
      {overlays}
      {footer}
    </div>
  );
}
