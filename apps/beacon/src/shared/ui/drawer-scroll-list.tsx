import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, Plus } from "lucide-react";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { ScrollArea } from "@/shared/ui/scroll-area";

export const drawerScrollListInsetClass = "px-4";
/** Trailing scroll-end breathing room: matches the drawer header's `pb-3` so the last row clears the sticky footer. */
const drawerScrollListEndPadClass = "pb-3";

const drawerScrollListRegionClass = "relative min-h-0 min-w-0 w-full flex-1";
const drawerScrollListScrollAreaClass = "size-full min-h-0 w-full";
const drawerScrollListLoaderVariants = cva(
  "pointer-events-auto absolute inset-0 z-10 flex justify-center bg-popover/75 backdrop-blur-[1px]",
  {
    variants: {
      align: {
        center: "items-center",
        top: "items-start pt-6",
      },
    },
    defaultVariants: {
      align: "center",
    },
  }
);
const drawerScrollListClass = cn(drawerScrollListInsetClass, drawerScrollListEndPadClass, "m-0 list-none");
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
  /** Rendered in the loading overlay instead of the default spinner (e.g. a progress bar). */
  loadingContent?: React.ReactNode;
  /** Vertical placement of the loading overlay content. Defaults to centered. */
  loadingAlign?: VariantProps<typeof drawerScrollListLoaderVariants>["align"];
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: React.ReactNode;
  emptyContent?: React.ReactNode;
  /** Render children directly (no `<ul>`) for lists that own their own semantics, e.g. a radio group. */
  listless?: boolean;
  children: React.ReactNode;
};

export function DrawerScrollList(props: DrawerScrollListProps) {
  const {
    "aria-label": ariaLabel,
    "data-slot": dataSlot,
    loading = false,
    loadingAriaLabel,
    loadingContent,
    loadingAlign = "center",
    error = null,
    isEmpty = false,
    emptyMessage,
    emptyContent,
    listless = false,
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
          <div
            className={drawerScrollListLoaderVariants({ align: loadingAlign })}
            role="status"
            aria-live="polite"
            aria-label={loadingAriaLabel}
          >
            {loadingContent ?? <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />}
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
          ) : listless ? (
            <div className={cn(drawerScrollListInsetClass, drawerScrollListEndPadClass)}>{children}</div>
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

/** Variants nested under a component: one vertical guide rail, no separators, so they read as children of the row. */
const drawerScrollListNestedGroupClass = "m-0 ml-4 list-none border-l border-border/70 p-0 pl-1";

type DrawerScrollListAddActionRowProps = {
  label: React.ReactNode;
  ariaLabel: string;
  disabled?: boolean;
  added?: boolean;
  title?: string;
  onClick: () => void;
};

function DrawerScrollListAddActionButton(props: DrawerScrollListAddActionRowProps) {
  const { label, ariaLabel, disabled = false, added = false, title, onClick } = props;

  return (
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
  );
}

export function DrawerScrollListAddActionRow(props: DrawerScrollListAddActionRowProps) {
  return (
    <DrawerScrollListItem>
      <DrawerScrollListAddActionButton {...props} />
    </DrawerScrollListItem>
  );
}

/** A component row plus its variant rows, nested under it with a vertical guide rail. */
export function DrawerScrollListAddActionGroup(props: {
  base: DrawerScrollListAddActionRowProps;
  variants: Array<DrawerScrollListAddActionRowProps & { id: string }>;
}) {
  const { base, variants } = props;
  if (variants.length === 0) {
    return <DrawerScrollListAddActionRow {...base} />;
  }
  return (
    <DrawerScrollListItem>
      <DrawerScrollListAddActionButton {...base} />
      <ul className={drawerScrollListNestedGroupClass}>
        {variants.map(({ id, ...variant }) => (
          <DrawerScrollListAddActionRow key={id} {...variant} />
        ))}
      </ul>
    </DrawerScrollListItem>
  );
}
