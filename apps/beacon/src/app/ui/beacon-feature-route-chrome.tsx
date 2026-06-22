import { cva, type VariantProps } from "class-variance-authority";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import type * as React from "react";
import type { ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";
import {
  beaconAppRouteSurfaceClass,
  beaconPanelContainClass,
  beaconRouteBleedXClass,
  beaconRouteScrollContentClass,
  beaconRouteScrollViewportFillClass,
} from "@/shared/lib/beacon-app-route-surface";
import { cn } from "@/shared/lib/utils";
import { Button, type buttonVariants } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { hasBeaconRouteSubheaderContent } from "@/shared/ui/step-nav";

export type BeaconFeatureRouteHeaderProps = {
  title: string;
  dataSlot?: string;
};

export function BeaconFeatureRouteHeader(props: BeaconFeatureRouteHeaderProps) {
  const { title, dataSlot = "beacon_feature_route_header" } = props;

  return (
    <div className="shrink-0 border-b border-border/65 bg-background" data-slot={dataSlot}>
      <div className={cn(beaconPanelContainClass, "flex h-8 items-center justify-center px-3")}>
        <h2 className="min-w-0 w-full truncate text-center text-sm font-medium leading-none tracking-tight text-foreground">
          {title}
        </h2>
      </div>
    </div>
  );
}

export type BeaconFeatureRouteBackHeaderProps = {
  title: string;
  onBack: () => void;
  backLabel?: string;
  dataSlot?: string;
};

/** Route header with a leading back control and truncated title (e.g. settings drill-down). */
export function BeaconFeatureRouteBackHeader(props: BeaconFeatureRouteBackHeaderProps) {
  const { title, onBack, backLabel = "Back", dataSlot = "beacon_feature_route_back_header" } = props;

  return (
    <div className="shrink-0 border-b border-border/65 bg-background" data-slot={dataSlot}>
      <div className={cn(beaconPanelContainClass, "grid h-8 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-3")}>
        <Button type="button" size="icon-sm" variant="ghost" onClick={onBack} aria-label={backLabel}>
          <ArrowLeft aria-hidden className="size-4" />
        </Button>
        <h2 className="min-w-0 truncate text-sm font-medium leading-none tracking-tight text-foreground">{title}</h2>
      </div>
    </div>
  );
}

export type BeaconFeatureRouteScrollBodyProps = {
  children: ReactNode;
  /** Full-bleed loader rendered above route drawers/dialogs (portaled; not inside scroll content). */
  overlay?: ReactNode;
  className?: string;
  contentClassName?: string;
  /** When false, children fill the body without a route-level ScrollArea (use for nested scroll regions). */
  scrollable?: boolean;
  /** When this value changes, the scroll viewport resets to the top (e.g. image editor flow step). */
  scrollResetKey?: string | number | boolean | null;
};

export function BeaconFeatureRouteScrollBody(props: BeaconFeatureRouteScrollBodyProps) {
  const { children, overlay, className, contentClassName, scrollable = true, scrollResetKey } = props;
  const viewportRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!scrollable || scrollResetKey === undefined) {
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    viewport.scrollTop = 0;
  }, [scrollResetKey, scrollable]);

  const contentClass = cn(
    beaconRouteScrollContentClass,
    beaconRouteScrollViewportFillClass,
    !scrollable && "min-h-0 flex-1 overflow-hidden",
    contentClassName
  );

  const content = <div className={contentClass}>{children}</div>;

  return (
    <div className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col", !scrollable && "overflow-hidden", className)}>
      {overlay}
      {scrollable ? (
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1" viewportRef={viewportRef}>
          {content}
        </ScrollArea>
      ) : (
        content
      )}
    </div>
  );
}

const beaconFeatureRouteFooterVariants = cva(
  "mt-auto flex shrink-0 border-t border-border/65 bg-background px-3 pt-2 pb-[max(env(safe-area-inset-bottom,0px),0.375rem)]",
  {
    variants: {
      layout: {
        default: "",
        dockActions: "items-stretch gap-2",
      },
    },
    defaultVariants: {
      layout: "default",
    },
  }
);

export type BeaconFeatureRouteFooterProps = React.ComponentProps<"footer"> &
  VariantProps<typeof beaconFeatureRouteFooterVariants> & {
    children: ReactNode;
    dataSlot?: string;
  };

export function BeaconFeatureRouteFooter(props: BeaconFeatureRouteFooterProps) {
  const { children, dataSlot = "beacon_feature_route_footer", className, layout, ...footerProps } = props;
  return (
    <footer
      data-slot={dataSlot}
      className={cn(beaconFeatureRouteFooterVariants({ layout }), className)}
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

/** Full-width dock back control with a leading chevron and centered label. */
export function BeaconFeatureRouteDockBackButton(props: BeaconFeatureRouteDockButtonProps) {
  const { children, emphasized = false, size = "dockNavFull", ...rest } = props;
  return (
    <BeaconFeatureRouteDockButton emphasized={emphasized} size={size} {...rest}>
      <ChevronLeft aria-hidden className="size-4" strokeWidth={2.25} />
      {children}
    </BeaconFeatureRouteDockButton>
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

const beaconFeatureRouteSubheaderVariants = cva("shrink-0", {
  variants: {
    surface: {
      /** Pinned strip with its own background and divider (standalone under the route header). */
      default: "border-b border-border/50 bg-background",
      /** Transparent strip with no background or divider (e.g. breadcrumbs sitting on a host sheet). */
      plain: "",
    },
  },
  defaultVariants: {
    surface: "default",
  },
});

export type BeaconFeatureRouteSubheaderProps = VariantProps<typeof beaconFeatureRouteSubheaderVariants> & {
  children: ReactNode;
  dataSlot?: string;
};

/** Pinned strip directly under the route header (e.g. step breadcrumbs). Hidden when empty. */
export function BeaconFeatureRouteSubheader(props: BeaconFeatureRouteSubheaderProps) {
  const { children, surface, dataSlot = "beacon_feature_route_subheader" } = props;
  if (!hasBeaconRouteSubheaderContent(children)) {
    return null;
  }
  return (
    <div className={beaconFeatureRouteSubheaderVariants({ surface })} data-slot={dataSlot}>
      {/* Plain (borderless) strips host the breadcrumbs on a sheet that owns its title — match the host title's
          `px-4` inset and keep them tight to the title and content. Default strips align to the route content `px-3`. */}
      <div className={cn(beaconPanelContainClass, surface === "plain" ? "px-4 py-1" : "px-3 py-2")}>{children}</div>
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
