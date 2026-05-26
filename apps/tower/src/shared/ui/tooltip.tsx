import { IconInfoCircle } from "@tabler/icons-react";
import { cva, type VariantProps } from "class-variance-authority";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/shared/lib/utils";

const tooltipContentVariants = cva(
  "z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md bg-foreground px-2 py-1 text-xs text-background data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  {
    variants: {
      variant: {
        default: "font-medium",
        detail:
          "flex max-w-xs flex-col gap-2.5 px-3 py-2 text-left font-normal leading-snug *:data-[slot=tooltip-detail-summary]:leading-relaxed *:data-[slot=tooltip-detail-heading]:font-medium *:data-[slot=tooltip-detail-note]:text-[0.6875rem] *:data-[slot=tooltip-detail-note]:leading-relaxed *:data-[slot=tooltip-detail-note]:text-background/75",
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
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & VariantProps<typeof tooltipContentVariants>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
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

function TooltipDetailListItem({ feature, detail }: { feature: string; detail?: string }) {
  return (
    <li data-slot="tooltip-detail-list-item" className="flex gap-1.5 text-background/85">
      <span aria-hidden className="select-none">
        •
      </span>
      <span>
        <span data-slot="tooltip-detail-list-item-feature" className="font-medium text-background">
          {feature}
        </span>
        {detail ? (
          <>
            <span aria-hidden> — </span>
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
