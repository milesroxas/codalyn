import type { TowerUsageProductFeature } from "@codalyn/webflow-kit";
import {
  TooltipProductBadge as SharedTooltipProductBadge,
  UsageMeterTooltipListItem as SharedUsageMeterTooltipListItem,
  UsageMeterTooltipListItemDetail as SharedUsageMeterTooltipListItemDetail,
  USAGE_METER_TOOLTIP_COLLISION_PADDING,
  usageMeterTooltipMaxWidthClass,
} from "@codalyn/webflow-kit/react";
import { IconInfoCircle } from "@tabler/icons-react";
import { cva, type VariantProps } from "class-variance-authority";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/shared/lib/utils";

const tooltipContentVariants = cva(
  "z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-sm bg-foreground text-xs text-background data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  {
    variants: {
      variant: {
        default: "px-2 py-1 font-medium",
        detail:
          "flex max-w-[18rem] flex-col gap-3 px-3 py-2.5 text-left font-normal leading-relaxed shadow-md *:data-[slot=tooltip-detail-summary]:text-background/90 *:data-[slot=tooltip-detail-heading]:text-[0.6875rem] *:data-[slot=tooltip-detail-heading]:font-semibold *:data-[slot=tooltip-detail-heading]:uppercase *:data-[slot=tooltip-detail-heading]:tracking-[0.08em] *:data-[slot=tooltip-detail-heading]:text-background/55 *:data-[slot=tooltip-detail-note]:border-t *:data-[slot=tooltip-detail-note]:border-background/15 *:data-[slot=tooltip-detail-note]:pt-2.5 *:data-[slot=tooltip-detail-note]:text-[0.6875rem] *:data-[slot=tooltip-detail-note]:leading-relaxed *:data-[slot=tooltip-detail-note]:text-background/60",
        usageMeter: [
          usageMeterTooltipMaxWidthClass,
          "rounded-sm border border-background/10 px-3 py-2.5 text-left font-normal leading-relaxed shadow-md",
          "*:data-[slot=tooltip-detail-summary]:text-background/90",
          "*:data-[slot=tooltip-detail-heading]:text-[0.6875rem]",
          "*:data-[slot=tooltip-detail-heading]:font-semibold",
          "*:data-[slot=tooltip-detail-heading]:uppercase",
          "*:data-[slot=tooltip-detail-heading]:tracking-[0.08em]",
          "*:data-[slot=tooltip-detail-heading]:text-background/55",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function TooltipProvider({ delayDuration = 150, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  variant,
  sideOffset = 6,
  collisionPadding,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> &
  VariantProps<typeof tooltipContentVariants> & {
    collisionPadding?: number;
  }) {
  const resolvedCollisionPadding =
    collisionPadding ??
    (variant === "usageMeter" || variant === "detail" ? USAGE_METER_TOOLTIP_COLLISION_PADDING : undefined);

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        collisionPadding={resolvedCollisionPadding}
        className={cn(tooltipContentVariants({ variant }), className)}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

function TooltipDetailSummary({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="tooltip-detail-summary" className={cn(className)} {...props} />;
}

function TooltipDetailSection({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="tooltip-detail-section" className={cn("flex flex-col gap-1", className)} {...props} />;
}

function TooltipDetailHeading({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="tooltip-detail-heading" className={cn(className)} {...props} />;
}

function TooltipDetailList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul data-slot="tooltip-detail-list" className={cn("flex list-none flex-col gap-1.5 p-0", className)} {...props} />
  );
}

function TooltipDetailListItem({
  feature,
  detail,
  product,
}: {
  feature?: string;
  detail?: string;
  product?: TowerUsageProductFeature;
}) {
  if (product != null) {
    return (
      <SharedUsageMeterTooltipListItem>
        <SharedTooltipProductBadge product={product} />
        {detail ? <SharedUsageMeterTooltipListItemDetail>{detail}</SharedUsageMeterTooltipListItemDetail> : null}
      </SharedUsageMeterTooltipListItem>
    );
  }

  return (
    <li data-slot="tooltip-detail-list-item" className="flex gap-1.5 text-background/85">
      <span aria-hidden className="select-none">
        •
      </span>
      <span>
        {feature ? (
          <span data-slot="tooltip-detail-list-item-feature" className="font-medium text-background">
            {feature}
          </span>
        ) : null}
        {detail ? (
          <>
            {feature ? <span aria-hidden> — </span> : null}
            <span data-slot="tooltip-detail-list-item-detail" className="text-background/75">
              {detail}
            </span>
          </>
        ) : null}
      </span>
    </li>
  );
}

function TooltipDetailNote({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="tooltip-detail-note" className={cn(className)} {...props} />;
}

function TooltipHelpTrigger({ label }: { label: string }) {
  return (
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={label}
        className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-sm text-muted-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconInfoCircle aria-hidden className="size-3.5" stroke={1.5} />
      </button>
    </TooltipTrigger>
  );
}

export {
  Tooltip,
  TooltipContent,
  TooltipDetailHeading,
  TooltipDetailList,
  TooltipDetailListItem,
  TooltipDetailNote,
  TooltipDetailSection,
  TooltipDetailSummary,
  TooltipHelpTrigger,
  TooltipProvider,
  TooltipTrigger,
};
