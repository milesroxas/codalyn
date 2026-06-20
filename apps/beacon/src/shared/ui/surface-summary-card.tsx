import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, MoreVertical } from "lucide-react";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Progress } from "@/shared/ui/progress";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Skeleton } from "@/shared/ui/skeleton";

const surfaceSummaryCardVariants = cva("flex min-w-0 flex-col gap-2 rounded-sm border px-3 py-2.5 text-left", {
  variants: {
    state: {
      empty: "border-border/60 bg-muted/20",
      selected: "border-border/80 bg-muted/35",
    },
  },
  defaultVariants: {
    state: "empty",
  },
});

const surfaceSummaryCardLabelClass = "text-[11px] font-medium text-muted-foreground";
const surfaceSummaryCardTitleVariants = cva("font-medium leading-snug", {
  variants: {
    density: {
      default: "text-sm",
      compact: "text-xs",
    },
  },
  defaultVariants: {
    density: "default",
  },
});
const surfaceSummaryCardMetaVariants = cva("leading-snug", {
  variants: {
    emphasis: {
      default: "text-muted-foreground text-[10px]",
      hint: "text-muted-foreground text-xs leading-relaxed",
      prominent: "text-sm font-semibold text-foreground",
    },
  },
  defaultVariants: {
    emphasis: "default",
  },
});

const surfaceSummaryCardActionRowVariants = cva("flex min-w-0 items-center justify-between gap-2", {
  variants: {
    prominence: {
      default: "",
      elevated: "rounded-md border border-border/70 bg-muted/25 px-3 py-2.5",
    },
  },
  defaultVariants: {
    prominence: "default",
  },
});
const surfaceSummaryCardEmptyClass = "text-muted-foreground text-xs leading-relaxed";
const surfaceSummaryCardPendingClass = "text-muted-foreground flex items-center gap-2 text-xs leading-relaxed";
const surfaceSummaryCardSectionLabelClass = "text-[10px] font-medium text-muted-foreground";

const surfaceSummaryCardPanelSectionLabelClass =
  "text-[10px] font-medium uppercase tracking-wide text-muted-foreground";

const surfaceSummaryCardPanelVariants = cva("flex min-w-0 flex-col overflow-hidden rounded-md border text-left", {
  variants: {
    tone: {
      default: "border-border/80 bg-card",
      callout: "border-dashed border-border/70 bg-muted/15 shadow-sm",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const surfaceSummaryCardIconBoxVariants = cva(
  "flex shrink-0 items-center justify-center rounded-sm border bg-muted/40 text-muted-foreground",
  {
    variants: {
      tone: {
        default: "border-border/70",
      },
      density: {
        default: "size-9 [&_svg:not([class*='size-'])]:size-4",
        compact: "size-7 [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      tone: "default",
      density: "default",
    },
  }
);

const surfaceSummaryCardNestedCardVariants = cva("flex min-w-0 items-center gap-3 rounded-sm border px-3 py-2.5", {
  variants: {
    tone: {
      default: "border-border/70 bg-muted/20",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const surfaceSummaryCardOptionRowVariants = cva(
  "flex min-w-0 w-full cursor-pointer items-center gap-3 rounded-sm border px-3 py-2.5 text-left outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      tone: {
        default: "border-border/70 bg-muted/15 hover:bg-muted/30",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  }
);

const surfaceSummaryCardOptionRowChevronVariants = cva("shrink-0 text-muted-foreground", {
  variants: {
    density: {
      default: "size-4 [&_svg:not([class*='size-'])]:size-4",
      compact: "size-3.5 [&_svg:not([class*='size-'])]:size-3.5",
    },
  },
  defaultVariants: {
    density: "default",
  },
});

const surfaceSummaryCardSelectRowVariants = cva(
  "flex min-w-0 w-full items-center rounded-sm border text-left transition-colors has-focus-visible:outline-none has-focus-visible:ring-2 has-focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      selected: {
        // Active state reads from fill, not an outline: solid accent sits clearly above the muted hover for contrast
        // on the drawer surface. Border stays (transparent) to hold the 1px box model and avoid layout shift.
        true: "border-transparent bg-accent text-accent-foreground hover:bg-accent",
        false: "border-border/70 bg-muted/15 hover:bg-muted/30",
      },
      interactive: {
        true: "cursor-pointer",
        false: "cursor-default",
      },
      density: {
        default: "gap-3 px-3 py-2.5",
        compact: "gap-2 px-2 py-1.5",
      },
    },
    defaultVariants: {
      selected: false,
      interactive: true,
      density: "default",
    },
  }
);

const surfaceSummaryCardSurfaceDisplayVariants = cva("flex min-w-0 w-full items-center gap-3 text-left", {
  variants: {
    frame: {
      inline: "",
      inset: "overflow-hidden rounded-md bg-card px-3 py-2.5 text-card-foreground",
      card: "overflow-hidden rounded-md border border-border/80 bg-card px-3 py-2.5 text-card-foreground shadow-sm",
    },
  },
  defaultVariants: {
    frame: "inline",
  },
});

const surfaceSummaryCardSurfaceActionsClass = "shrink-0";

const surfaceSummaryCardSelectRowControlClass = "shrink-0";

const surfaceSummaryCardSelectRowListVariants = cva("flex min-w-0 flex-col", {
  variants: {
    density: {
      default: "gap-2",
      compact: "gap-1",
    },
  },
  defaultVariants: {
    density: "default",
  },
});

const surfaceSummaryCardSurfaceSummaryClass = "flex min-w-0 flex-col gap-2";

const surfaceSummaryCardFormFieldsClass = "flex min-w-0 flex-col gap-4";

const surfaceSummaryCardActionGroupVariants = cva(
  "flex min-w-0 w-full items-stretch gap-2 [&_[data-slot=button]]:min-w-0 [&_[data-slot=button]]:flex-1",
  {
    variants: {
      layout: {
        row: "flex-row",
        stack: "flex-col [&_[data-slot=button]]:w-full [&_[data-slot=button]]:flex-none",
      },
    },
    defaultVariants: {
      layout: "row",
    },
  }
);

const surfaceSummaryCardIconActionGroupClass = "flex shrink-0 items-center gap-1";

const surfaceSummaryCardScanListSectionClass = "flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2";
const surfaceSummaryCardScanListSectionHeaderClass = "flex min-w-0 shrink-0 items-center justify-between gap-2";
const surfaceSummaryCardScanListSectionLabelClass = "text-muted-foreground text-xs";
const surfaceSummaryCardScanListStatusClass = "text-muted-foreground flex shrink-0 items-center gap-2 text-xs";
const surfaceSummaryCardScanListErrorClass = "shrink-0 text-destructive text-xs";
const surfaceSummaryCardScanListScrollRegionClass =
  "relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-sm border border-border/80 bg-card text-card-foreground shadow-sm data-[state=loading]:min-h-18";
const surfaceSummaryCardScanListScrollAreaClass = "min-h-0 w-full flex-1 rounded-[inherit]";
const surfaceSummaryCardScanListScrollLoaderClass =
  "pointer-events-auto absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-card/80 px-6 backdrop-blur-[1px]";
const surfaceSummaryCardScanListScrollInlineProgressClass =
  "flex shrink-0 flex-col gap-1.5 border-b border-border/60 px-3 py-2";
const surfaceSummaryCardScanListScrollInlineSpinnerClass =
  "text-muted-foreground flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2 text-xs";
const surfaceSummaryCardScanListProgressPanelClass = "flex w-full min-w-0 max-w-xs flex-col gap-1.5";
const surfaceSummaryCardScanListProgressLabelClass = "text-sm font-medium leading-none";
const surfaceSummaryCardScanListProgressDetailClass = "text-muted-foreground text-xs leading-snug tabular-nums";
const surfaceSummaryCardScanListScrollToolbarClass =
  "flex shrink-0 min-w-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2";
const surfaceSummaryCardScanListScrollTitleClass = "text-sm font-medium leading-none";
const surfaceSummaryCardScanListScrollContentClass = "px-3 py-1.5";
const surfaceSummaryCardScanListScrollEmptyClass = "flex min-h-16 items-center text-muted-foreground text-xs";

const surfaceSummaryCardPageIntroClass = "space-y-1";
const surfaceSummaryCardPageIntroTitleClass = "text-sm font-medium";
const surfaceSummaryCardPageIntroDescriptionClass = "text-muted-foreground text-xs";

const surfaceSummaryCardNestedCardListClass = "flex min-w-0 flex-col gap-2";

const surfaceSummaryCardIntroClass = "text-muted-foreground text-xs leading-relaxed";

function SurfaceSummaryCard({
  className,
  state,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof surfaceSummaryCardVariants>) {
  return (
    <div data-slot="surface-summary-card" className={cn(surfaceSummaryCardVariants({ state }), className)} {...props} />
  );
}

function SurfaceSummaryCardLabel({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="surface-summary-card-label" className={cn(surfaceSummaryCardLabelClass, className)} {...props} />
  );
}

function SurfaceSummaryCardBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="surface-summary-card-body" className={cn("flex min-w-0 flex-col gap-0.5", className)} {...props} />
  );
}

function SurfaceSummaryCardTitle({
  className,
  density,
  ...props
}: React.ComponentProps<"p"> & VariantProps<typeof surfaceSummaryCardTitleVariants>) {
  return (
    <p
      data-slot="surface-summary-card-title"
      className={cn(surfaceSummaryCardTitleVariants({ density }), className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardMeta({
  className,
  emphasis,
  ...props
}: React.ComponentProps<"p"> & VariantProps<typeof surfaceSummaryCardMetaVariants>) {
  return (
    <p
      data-slot="surface-summary-card-meta"
      className={cn(surfaceSummaryCardMetaVariants({ emphasis }), className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardPending({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="surface-summary-card-pending" className={cn(surfaceSummaryCardPendingClass, className)} {...props} />
  );
}

function SurfaceSummaryCardEmpty({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="surface-summary-card-empty" className={cn(surfaceSummaryCardEmptyClass, className)} {...props} />
  );
}

function SurfaceSummaryCardSection({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-section"
      className={cn("flex min-w-0 flex-col gap-1.5", className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardSectionLabel({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="surface-summary-card-section-label"
      className={cn(surfaceSummaryCardSectionLabelClass, className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardActionRow({
  className,
  prominence,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof surfaceSummaryCardActionRowVariants>) {
  return (
    <div
      data-slot="surface-summary-card-action-row"
      className={cn(surfaceSummaryCardActionRowVariants({ prominence }), className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardActionCopy({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="surface-summary-card-action-copy" className={cn("min-w-0 flex-1", className)} {...props} />;
}

type SurfaceSummaryCardCanvasActionRowProps = {
  label: string;
  labelEmphasis?: VariantProps<typeof surfaceSummaryCardMetaVariants>["emphasis"];
  actionLabel: string;
  actionPendingLabel?: string;
  pending?: boolean;
  disabled?: boolean;
  onAction: () => void;
  actionVariant?: "default" | "secondary";
};

/** Prominent context label with a compact canvas action (e.g. Find on canvas, Focus on canvas). */
function SurfaceSummaryCardCanvasActionRow(props: SurfaceSummaryCardCanvasActionRowProps) {
  const {
    label,
    labelEmphasis = "prominent",
    actionLabel,
    actionPendingLabel,
    pending = false,
    disabled = false,
    onAction,
    actionVariant = "secondary",
  } = props;
  const prominence = labelEmphasis === "prominent" ? "elevated" : "default";

  return (
    <SurfaceSummaryCardActionRow prominence={prominence}>
      <SurfaceSummaryCardActionCopy>
        <SurfaceSummaryCardMeta emphasis={labelEmphasis}>{label}</SurfaceSummaryCardMeta>
      </SurfaceSummaryCardActionCopy>
      <Button
        type="button"
        variant={actionVariant}
        size="sm"
        disabled={disabled}
        aria-busy={pending}
        onClick={onAction}
      >
        {pending && actionPendingLabel != null ? actionPendingLabel : actionLabel}
      </Button>
    </SurfaceSummaryCardActionRow>
  );
}

function SurfaceSummaryCardPanel({
  className,
  tone,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof surfaceSummaryCardPanelVariants>) {
  return (
    <div
      data-slot="surface-summary-card-panel"
      className={cn(surfaceSummaryCardPanelVariants({ tone }), className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardPanelSection({
  className,
  showDivider = true,
  density = "default",
  ...props
}: React.ComponentProps<"section"> & {
  showDivider?: boolean;
  density?: "default" | "compact";
}) {
  return (
    <section
      data-slot="surface-summary-card-panel-section"
      data-density={density}
      className={cn(
        "flex min-w-0 flex-col px-3",
        density === "compact" ? "gap-1.5 py-2" : "gap-2 py-3",
        showDivider && "border-b border-border/60",
        className
      )}
      {...props}
    />
  );
}

function SurfaceSummaryCardPanelSectionLabel({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="surface-summary-card-panel-section-label"
      className={cn(surfaceSummaryCardPanelSectionLabelClass, className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardIntro({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="surface-summary-card-intro" className={cn(surfaceSummaryCardIntroClass, className)} {...props} />
  );
}

function SurfaceSummaryCardIconBox({
  className,
  tone,
  density,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof surfaceSummaryCardIconBoxVariants>) {
  return (
    <div
      data-slot="surface-summary-card-icon-box"
      className={cn(surfaceSummaryCardIconBoxVariants({ tone, density }), className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardIconRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-icon-row"
      className={cn("flex min-w-0 items-center gap-3", className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardIconRowCopy({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-icon-row-copy"
      className={cn("flex min-w-0 flex-1 flex-col gap-0.5", className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardNestedCard({
  className,
  tone,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof surfaceSummaryCardNestedCardVariants>) {
  return (
    <div
      data-slot="surface-summary-card-nested-card"
      className={cn(surfaceSummaryCardNestedCardVariants({ tone }), className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardNestedCardCopy({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-nested-card-copy"
      className={cn("flex min-w-0 flex-1 flex-col gap-0.5", className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardOptionRow({
  className,
  tone,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof surfaceSummaryCardOptionRowVariants>) {
  return (
    <button
      type="button"
      data-slot="surface-summary-card-option-row"
      className={cn(surfaceSummaryCardOptionRowVariants({ tone }), className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardOptionRowCopy({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-option-row-copy"
      className={cn("flex min-w-0 flex-1 flex-col gap-0.5 text-left", className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardOptionRows({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-option-rows"
      className={cn("flex min-w-0 w-full flex-col gap-2", className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardActionGroup({
  className,
  layout,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof surfaceSummaryCardActionGroupVariants>) {
  return (
    <div
      data-slot="surface-summary-card-action-group"
      className={cn(surfaceSummaryCardActionGroupVariants({ layout }), className)}
      {...props}
    />
  );
}

/** Compact icon-only controls aligned to the leading edge of a summary icon row. */
function SurfaceSummaryCardIconActionGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-icon-action-group"
      className={cn(surfaceSummaryCardIconActionGroupClass, className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardNestedCardList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-nested-card-list"
      className={cn(surfaceSummaryCardNestedCardListClass, className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardOptionRowChevron({
  className,
  density,
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof surfaceSummaryCardOptionRowChevronVariants>) {
  return (
    <span
      data-slot="surface-summary-card-option-row-chevron"
      className={cn(surfaceSummaryCardOptionRowChevronVariants({ density }), className)}
      {...props}
    >
      {children}
    </span>
  );
}

function SurfaceSummaryCardSelectRow({
  className,
  selected = false,
  interactive = true,
  density,
  htmlFor,
  children,
  ...props
}: React.ComponentProps<"label"> & VariantProps<typeof surfaceSummaryCardSelectRowVariants>) {
  return (
    <label
      htmlFor={htmlFor}
      data-slot="surface-summary-card-select-row"
      data-selected={selected ? "true" : "false"}
      data-density={density ?? "default"}
      className={cn(surfaceSummaryCardSelectRowVariants({ selected, interactive, density }), className)}
      {...props}
    >
      {children}
    </label>
  );
}

function SurfaceSummaryCardSelectRowControl({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-select-row-control"
      className={cn(surfaceSummaryCardSelectRowControlClass, className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardSurfaceDisplay({
  className,
  frame,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof surfaceSummaryCardSurfaceDisplayVariants>) {
  return (
    <div
      data-slot="surface-summary-card-surface-display"
      data-frame={frame ?? "inline"}
      className={cn(surfaceSummaryCardSurfaceDisplayVariants({ frame }), className)}
      {...props}
    />
  );
}

const surfaceSummaryCardSurfaceDisplaySkeletonIconClass =
  "size-9 shrink-0 rounded-sm border border-border/70 bg-muted/40";
const surfaceSummaryCardSurfaceDisplaySkeletonTitleClass = "h-4 w-[min(100%,12rem)] rounded-sm";
const surfaceSummaryCardSurfaceDisplaySkeletonMetaClass = "h-2.5 w-[min(100%,10rem)] rounded-sm";
const surfaceSummaryCardSurfaceDisplaySkeletonHintMetaClass = "h-3 w-[min(100%,8rem)] rounded-sm";

type SurfaceSummaryCardSurfaceDisplaySkeletonProps = {
  /** Mirrors optional third meta line on the loaded surface display (e.g. slot list). */
  showSlotList?: boolean;
  loadingLabel: string;
  frame?: VariantProps<typeof surfaceSummaryCardSurfaceDisplayVariants>["frame"];
};

function SurfaceSummaryCardSurfaceDisplaySkeleton(props: SurfaceSummaryCardSurfaceDisplaySkeletonProps) {
  const { showSlotList = false, loadingLabel, frame = "card" } = props;

  return (
    <SurfaceSummaryCardSurfaceDisplay
      frame={frame}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-slot="surface-summary-card-surface-display-skeleton"
    >
      <span className="sr-only">{loadingLabel}</span>
      <Skeleton className={surfaceSummaryCardSurfaceDisplaySkeletonIconClass} />
      <SurfaceSummaryCardIconRowCopy>
        <Skeleton className={surfaceSummaryCardSurfaceDisplaySkeletonTitleClass} />
        <Skeleton className={surfaceSummaryCardSurfaceDisplaySkeletonMetaClass} />
        {showSlotList ? <Skeleton className={surfaceSummaryCardSurfaceDisplaySkeletonHintMetaClass} /> : null}
      </SurfaceSummaryCardIconRowCopy>
    </SurfaceSummaryCardSurfaceDisplay>
  );
}

function SurfaceSummaryCardSelectRowList({
  className,
  density,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof surfaceSummaryCardSelectRowListVariants>) {
  return (
    <div
      data-slot="surface-summary-card-select-row-list"
      data-density={density ?? "default"}
      className={cn(surfaceSummaryCardSelectRowListVariants({ density }), className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardSurfaceSummary({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-surface-summary"
      className={cn(surfaceSummaryCardSurfaceSummaryClass, className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardFormFields({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-form-fields"
      className={cn(surfaceSummaryCardFormFieldsClass, className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardScanListSection({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-scan-list-section"
      className={cn(surfaceSummaryCardScanListSectionClass, className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardScanListSectionHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-scan-list-section-header"
      className={cn(surfaceSummaryCardScanListSectionHeaderClass, className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardScanListSectionLabel({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="surface-summary-card-scan-list-section-label"
      className={cn(surfaceSummaryCardScanListSectionLabelClass, className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardScanListStatus({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="surface-summary-card-scan-list-status"
      className={cn(surfaceSummaryCardScanListStatusClass, className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardScanListError({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="surface-summary-card-scan-list-error"
      className={cn(surfaceSummaryCardScanListErrorClass, className)}
      {...props}
    />
  );
}

type SurfaceSummaryCardScanListLoadingProgress = {
  value: number | null;
  indeterminate?: boolean;
  label: string;
  detail?: string;
};

type SurfaceSummaryCardScanListScrollBodyProps = {
  "data-slot": string;
  loading?: boolean;
  loadingAriaLabel?: string;
  loadingProgress?: SurfaceSummaryCardScanListLoadingProgress | null;
  inlineLoading?: boolean;
  inlineLoadingAriaLabel?: string;
  isEmpty?: boolean;
  emptyMessage?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
};

function SurfaceSummaryCardScanListProgress(props: { progress: SurfaceSummaryCardScanListLoadingProgress }) {
  const { progress } = props;
  const { value, indeterminate = false, label, detail } = progress;
  const ariaValueText = detail != null && detail.length > 0 ? `${label} ${detail}` : label;
  const showIndeterminate = indeterminate || value == null;

  return (
    <div
      className={surfaceSummaryCardScanListProgressPanelClass}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={showIndeterminate ? undefined : (value ?? undefined)}
      aria-valuetext={ariaValueText}
      aria-label={label}
      aria-busy={showIndeterminate}
    >
      <p className={surfaceSummaryCardScanListProgressLabelClass}>{label}</p>
      {detail ? <p className={surfaceSummaryCardScanListProgressDetailClass}>{detail}</p> : null}
      {showIndeterminate ? <Progress indeterminate /> : <Progress value={value ?? 0} />}
    </div>
  );
}

function SurfaceSummaryCardScanListScrollToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-scan-list-scroll-toolbar"
      className={cn(surfaceSummaryCardScanListScrollToolbarClass, className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardScanListScrollTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="surface-summary-card-scan-list-scroll-title"
      className={cn(surfaceSummaryCardScanListScrollTitleClass, className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardScanListScrollBody(props: SurfaceSummaryCardScanListScrollBodyProps) {
  const {
    "data-slot": dataSlot,
    loading = false,
    loadingAriaLabel,
    loadingProgress = null,
    inlineLoading = false,
    inlineLoadingAriaLabel,
    isEmpty = false,
    emptyMessage,
    toolbar,
    children,
  } = props;
  const showOverlayProgress = loading && loadingProgress != null;
  const showOverlaySpinner = loading && loadingProgress == null;
  const showInlineProgress = loadingProgress != null && !loading;
  const showInlineSpinner = inlineLoading && loadingProgress == null;
  const isLoading = loading || loadingProgress != null || inlineLoading;

  return (
    <div
      className={surfaceSummaryCardScanListScrollRegionClass}
      data-slot={dataSlot}
      data-state={isLoading ? "loading" : "idle"}
    >
      {showOverlayProgress ? (
        <div className={surfaceSummaryCardScanListScrollLoaderClass} aria-live="polite">
          <SurfaceSummaryCardScanListProgress progress={loadingProgress} />
        </div>
      ) : null}
      {showOverlaySpinner ? (
        <div
          className={surfaceSummaryCardScanListScrollLoaderClass}
          role="status"
          aria-live="polite"
          aria-label={loadingAriaLabel}
        >
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : null}
      {toolbar}
      {showInlineProgress ? (
        <div className={surfaceSummaryCardScanListScrollInlineProgressClass} aria-live="polite">
          <SurfaceSummaryCardScanListProgress progress={loadingProgress} />
        </div>
      ) : null}
      {showInlineSpinner ? (
        <div
          className={surfaceSummaryCardScanListScrollInlineSpinnerClass}
          role="status"
          aria-live="polite"
          aria-label={inlineLoadingAriaLabel}
        >
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
        </div>
      ) : null}
      <ScrollArea className={surfaceSummaryCardScanListScrollAreaClass} data-slot={`${dataSlot}_scroll`}>
        {isEmpty && !loading ? (
          <div className={cn(surfaceSummaryCardScanListScrollContentClass, surfaceSummaryCardScanListScrollEmptyClass)}>
            {emptyMessage}
          </div>
        ) : (
          <div className={surfaceSummaryCardScanListScrollContentClass}>{children}</div>
        )}
      </ScrollArea>
    </div>
  );
}

function SurfaceSummaryCardPageIntro(props: { title: string; description?: string }) {
  const { title, description } = props;

  return (
    <div data-slot="surface-summary-card-page-intro" className={surfaceSummaryCardPageIntroClass}>
      <h3 className={surfaceSummaryCardPageIntroTitleClass}>{title}</h3>
      {description ? <p className={surfaceSummaryCardPageIntroDescriptionClass}>{description}</p> : null}
    </div>
  );
}

export type SurfaceSummaryCardSurfaceActionsMenuItem = {
  id: string;
  label: string;
  pendingLabel?: string;
  variant?: "default" | "destructive";
  disabled?: boolean;
  pending?: boolean;
  onSelect: () => void;
};

type SurfaceSummaryCardSurfaceActionsMenuProps = {
  ariaLabel: string;
  disabled?: boolean;
  items: SurfaceSummaryCardSurfaceActionsMenuItem[];
};

function SurfaceSummaryCardSurfaceActionsMenu(props: SurfaceSummaryCardSurfaceActionsMenuProps) {
  const { ariaLabel, disabled = false, items } = props;

  if (items.length === 0) {
    return null;
  }

  return (
    <div data-slot="surface-summary-card-surface-actions" className={surfaceSummaryCardSurfaceActionsClass}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} aria-label={ariaLabel}>
            <MoreVertical aria-hidden strokeWidth={2} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-36">
          {items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              variant={item.variant}
              disabled={disabled || item.disabled || item.pending}
              onSelect={() => void item.onSelect()}
            >
              {item.pending && item.pendingLabel != null ? item.pendingLabel : item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export {
  SurfaceSummaryCard,
  SurfaceSummaryCardActionCopy,
  SurfaceSummaryCardActionGroup,
  SurfaceSummaryCardActionRow,
  SurfaceSummaryCardBody,
  SurfaceSummaryCardCanvasActionRow,
  SurfaceSummaryCardEmpty,
  SurfaceSummaryCardFormFields,
  SurfaceSummaryCardIconActionGroup,
  SurfaceSummaryCardIconBox,
  SurfaceSummaryCardIconRow,
  SurfaceSummaryCardIconRowCopy,
  SurfaceSummaryCardIntro,
  SurfaceSummaryCardLabel,
  SurfaceSummaryCardMeta,
  SurfaceSummaryCardNestedCard,
  SurfaceSummaryCardNestedCardCopy,
  SurfaceSummaryCardNestedCardList,
  SurfaceSummaryCardOptionRow,
  SurfaceSummaryCardOptionRowChevron,
  SurfaceSummaryCardOptionRowCopy,
  SurfaceSummaryCardOptionRows,
  SurfaceSummaryCardPageIntro,
  SurfaceSummaryCardPanel,
  SurfaceSummaryCardPanelSection,
  SurfaceSummaryCardPanelSectionLabel,
  SurfaceSummaryCardPending,
  SurfaceSummaryCardScanListError,
  SurfaceSummaryCardScanListScrollBody,
  SurfaceSummaryCardScanListScrollTitle,
  SurfaceSummaryCardScanListScrollToolbar,
  SurfaceSummaryCardScanListSection,
  SurfaceSummaryCardScanListSectionHeader,
  SurfaceSummaryCardScanListSectionLabel,
  SurfaceSummaryCardScanListStatus,
  SurfaceSummaryCardSection,
  SurfaceSummaryCardSectionLabel,
  SurfaceSummaryCardSelectRow,
  SurfaceSummaryCardSelectRowControl,
  SurfaceSummaryCardSelectRowList,
  SurfaceSummaryCardSurfaceActionsMenu,
  SurfaceSummaryCardSurfaceDisplay,
  SurfaceSummaryCardSurfaceDisplaySkeleton,
  SurfaceSummaryCardSurfaceSummary,
  SurfaceSummaryCardTitle,
};
