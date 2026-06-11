import { cva } from "class-variance-authority";
import { Loader2, Plus } from "lucide-react";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { ScrollArea } from "@/shared/ui/scroll-area";

export const drawerScrollListInsetClass = "px-4";

const drawerScrollListRegionClass = "relative min-h-0 min-w-0 w-full flex-1";
const drawerScrollListScrollAreaClass = "size-full min-h-0 w-full";
const drawerScrollListLoaderClass =
  "pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-popover/75 backdrop-blur-[1px]";
const drawerScrollListClass = cn(drawerScrollListInsetClass, "m-0 list-none");
const drawerScrollListItemClass = "py-0.5";
const drawerScrollListErrorClass = "shrink-0 text-sm text-destructive";
const drawerScrollListEmptyClass = "min-h-24 text-sm text-muted-foreground";

export const drawerScrollListRowButtonVariants = cva(
  "block w-full min-w-0 cursor-pointer rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed"
);

export const drawerScrollListRowShellVariants = cva("block w-full min-w-0 rounded-sm");

export const drawerScrollListRowSurfaceVariants = cva(
  "-mx-1 flex min-w-0 items-center justify-between gap-3 rounded-sm px-1 py-1.5 transition-colors hover:bg-muted/50"
);

const drawerScrollListAddActionRowLabelVariants = cva("min-w-0 truncate text-sm", {
  variants: {
    added: {
      true: "text-muted-foreground",
      false: "font-normal text-foreground",
    },
  },
  defaultVariants: {
    added: false,
  },
});

const drawerScrollListAddActionRowBadgeVariants = cva(
  "flex size-5 shrink-0 items-center justify-center rounded-full border",
  {
    variants: {
      added: {
        true: "border-border/60 text-muted-foreground",
        false: "border-border text-foreground",
      },
    },
    defaultVariants: {
      added: false,
    },
  }
);

type DrawerScrollListProps = {
  "aria-label": string;
  "data-slot": string;
  loading?: boolean;
  loadingAriaLabel?: string;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: React.ReactNode;
  emptyContent?: React.ReactNode;
  children: React.ReactNode;
};

export function DrawerScrollList(props: DrawerScrollListProps) {
  const {
    "aria-label": ariaLabel,
    "data-slot": dataSlot,
    loading = false,
    loadingAriaLabel,
    error = null,
    isEmpty = false,
    emptyMessage,
    emptyContent,
    children,
  } = props;

  return (
    <>
      {error ? (
        <p className={cn(drawerScrollListInsetClass, drawerScrollListErrorClass)} role="alert">
          {error}
        </p>
      ) : null}
      <div className={drawerScrollListRegionClass} data-slot={dataSlot} data-state={loading ? "loading" : "idle"}>
        {loading ? (
          <div className={drawerScrollListLoaderClass} role="status" aria-live="polite" aria-label={loadingAriaLabel}>
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : null}
        <ScrollArea className={drawerScrollListScrollAreaClass} data-slot={`${dataSlot}_scroll`}>
          {isEmpty && !loading ? (
            emptyContent ? (
              <div className={drawerScrollListInsetClass}>{emptyContent}</div>
            ) : emptyMessage ? (
              <div className={cn(drawerScrollListInsetClass, drawerScrollListEmptyClass, "flex items-center")}>
                {emptyMessage}
              </div>
            ) : (
              <div className={cn(drawerScrollListInsetClass, drawerScrollListEmptyClass)} aria-hidden />
            )
          ) : (
            <ul className={drawerScrollListClass} aria-label={ariaLabel}>
              {children}
            </ul>
          )}
        </ScrollArea>
      </div>
    </>
  );
}

export function DrawerScrollListItem(props: React.ComponentProps<"li">) {
  const { className, ...rest } = props;
  return <li className={cn(drawerScrollListItemClass, className)} {...rest} />;
}

export function DrawerScrollListRowSurface(props: React.ComponentProps<"span">) {
  const { className, ...rest } = props;
  return <span className={cn(drawerScrollListRowSurfaceVariants(), className)} {...rest} />;
}

type DrawerScrollListAddActionRowProps = {
  label: React.ReactNode;
  ariaLabel: string;
  disabled?: boolean;
  added?: boolean;
  title?: string;
  onClick: () => void;
};

export function DrawerScrollListAddActionRow(props: DrawerScrollListAddActionRowProps) {
  const { label, ariaLabel, disabled = false, added = false, title, onClick } = props;

  return (
    <DrawerScrollListItem>
      <button
        type="button"
        className={drawerScrollListRowButtonVariants()}
        onClick={() => void onClick()}
        disabled={disabled}
        aria-disabled={added}
        aria-label={ariaLabel}
        title={title}
      >
        <DrawerScrollListRowSurface>
          <span className={drawerScrollListAddActionRowLabelVariants({ added })}>{label}</span>
          <span className={drawerScrollListAddActionRowBadgeVariants({ added })} aria-hidden>
            <Plus className="size-2.5 stroke-[1.5]" />
          </span>
        </DrawerScrollListRowSurface>
      </button>
    </DrawerScrollListItem>
  );
}
