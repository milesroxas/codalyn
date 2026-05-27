import { cva, type VariantProps } from "class-variance-authority";
import { MoreVertical } from "lucide-react";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

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
const surfaceSummaryCardTitleClass = "text-sm font-medium leading-snug";
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
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const surfaceSummaryCardIconBoxVariants = cva(
  "flex size-9 shrink-0 items-center justify-center rounded-sm border bg-muted/40 text-muted-foreground [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      tone: {
        default: "border-border/70",
      },
    },
    defaultVariants: {
      tone: "default",
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

const surfaceSummaryCardOptionRowChevronClass = "size-4 shrink-0 text-muted-foreground";

const surfaceSummaryCardSelectRowVariants = cva(
  "flex min-w-0 w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors has-focus-visible:outline-none has-focus-visible:ring-2 has-focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      selected: {
        true: "border-primary/55 bg-accent/35 ring-1 ring-primary/15",
        false: "border-border/70 bg-muted/15 hover:bg-muted/30",
      },
      interactive: {
        true: "cursor-pointer",
        false: "cursor-default",
      },
    },
    defaultVariants: {
      selected: false,
      interactive: true,
    },
  }
);

const surfaceSummaryCardSurfaceDisplayVariants = cva("flex min-w-0 w-full items-center gap-3 text-left", {
  variants: {
    contained: {
      true: "overflow-hidden rounded-md border border-border/80 bg-card px-3 py-2.5 text-card-foreground shadow-sm",
      false: "",
    },
  },
  defaultVariants: {
    contained: false,
  },
});

const surfaceSummaryCardSurfaceActionsClass = "shrink-0";

const surfaceSummaryCardSelectRowListClass = "flex min-w-0 flex-col gap-2";

const surfaceSummaryCardSurfaceSummaryClass = "flex min-w-0 flex-col gap-2";

const surfaceSummaryCardFormFieldsClass = "flex min-w-0 flex-col gap-4";

const surfaceSummaryCardScanListSectionClass = "flex w-full min-w-0 flex-col gap-2";
const surfaceSummaryCardScanListSectionHeaderClass = "flex min-w-0 shrink-0 items-center justify-between gap-2";
const surfaceSummaryCardScanListSectionLabelClass = "text-muted-foreground text-xs";
const surfaceSummaryCardScanListStatusClass = "text-muted-foreground flex shrink-0 items-center gap-2 text-xs";
const surfaceSummaryCardScanListErrorClass = "shrink-0 text-destructive text-xs";

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

function SurfaceSummaryCardTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="surface-summary-card-title" className={cn(surfaceSummaryCardTitleClass, className)} {...props} />
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
  ...props
}: React.ComponentProps<"section"> & { showDivider?: boolean }) {
  return (
    <section
      data-slot="surface-summary-card-panel-section"
      className={cn("flex min-w-0 flex-col gap-2 px-3 py-3", showDivider && "border-b border-border/60", className)}
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
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof surfaceSummaryCardIconBoxVariants>) {
  return (
    <div
      data-slot="surface-summary-card-icon-box"
      className={cn(surfaceSummaryCardIconBoxVariants({ tone }), className)}
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

function SurfaceSummaryCardNestedCardList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-nested-card-list"
      className={cn(surfaceSummaryCardNestedCardListClass, className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardOptionRowChevron({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="surface-summary-card-option-row-chevron"
      className={cn(surfaceSummaryCardOptionRowChevronClass, "[&_svg:not([class*='size-'])]:size-4", className)}
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
  htmlFor,
  children,
  ...props
}: React.ComponentProps<"label"> & VariantProps<typeof surfaceSummaryCardSelectRowVariants>) {
  return (
    <label
      htmlFor={htmlFor}
      data-slot="surface-summary-card-select-row"
      data-selected={selected ? "true" : "false"}
      className={cn(surfaceSummaryCardSelectRowVariants({ selected, interactive }), className)}
      {...props}
    >
      {children}
    </label>
  );
}

function SurfaceSummaryCardSurfaceDisplay({
  className,
  contained,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof surfaceSummaryCardSurfaceDisplayVariants>) {
  return (
    <div
      data-slot="surface-summary-card-surface-display"
      data-contained={contained ? "true" : "false"}
      className={cn(surfaceSummaryCardSurfaceDisplayVariants({ contained }), className)}
      {...props}
    />
  );
}

function SurfaceSummaryCardSelectRowList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-summary-card-select-row-list"
      className={cn(surfaceSummaryCardSelectRowListClass, className)}
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
  SurfaceSummaryCardActionRow,
  SurfaceSummaryCardBody,
  SurfaceSummaryCardCanvasActionRow,
  SurfaceSummaryCardEmpty,
  SurfaceSummaryCardFormFields,
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
  SurfaceSummaryCardScanListSection,
  SurfaceSummaryCardScanListSectionHeader,
  SurfaceSummaryCardScanListSectionLabel,
  SurfaceSummaryCardScanListStatus,
  SurfaceSummaryCardSection,
  SurfaceSummaryCardSectionLabel,
  SurfaceSummaryCardSelectRow,
  SurfaceSummaryCardSelectRowList,
  SurfaceSummaryCardSurfaceActionsMenu,
  SurfaceSummaryCardSurfaceDisplay,
  SurfaceSummaryCardSurfaceSummary,
  SurfaceSummaryCardTitle,
};
