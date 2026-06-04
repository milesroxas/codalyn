import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

const tileVariants = cva("min-w-0 border", {
  variants: {
    variant: {
      cmsUpload:
        "relative flex min-h-[6.75rem] w-full flex-col rounded-xl border-border/80 bg-card text-left shadow-sm outline-none transition-[border-color,background-color,opacity] hover:border-border hover:bg-muted/25 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
      presetListInteractive:
        "relative flex min-h-[6.75rem] w-full flex-col items-start justify-end gap-0.5 rounded-xl border-border/80 bg-card p-3.5 text-left shadow-sm outline-none transition-[border-color,background-color,opacity] hover:border-border hover:bg-muted/25 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
      presetListReadonly:
        "relative flex min-h-[6.75rem] w-full flex-col items-start justify-end gap-0.5 rounded-xl border-border/80 bg-card p-3.5 text-left text-muted-foreground shadow-sm",
    },
  },
  defaultVariants: {
    variant: "cmsUpload",
  },
});

export type TileVariantProps = VariantProps<typeof tileVariants>;

const tileOverlayButtonVariants = cva("absolute top-1.5 right-1.5 z-10", {
  variants: {
    intent: {
      menu: "text-foreground/90 hover:bg-muted/60 hover:text-foreground",
      destructive: "text-muted-foreground hover:text-destructive",
    },
  },
  defaultVariants: {
    intent: "menu",
  },
});

const tileBottomPinnedLabelVariants = cva(
  "pointer-events-none absolute bottom-3 left-3.5 text-sm font-medium text-foreground",
  {
    variants: {
      reserveActionSpace: {
        true: "right-11",
        false: "right-3.5",
      },
    },
    defaultVariants: {
      reserveActionSpace: false,
    },
  }
);

const tilePresetTitleClass = "text-sm font-medium leading-snug";
const tilePresetMetaClass = "text-muted-foreground text-[10px] tabular-nums";

function TileGridListItem({ children }: { children: React.ReactNode }) {
  return <li className="list-none">{children}</li>;
}

function TileSurface({ children }: { children: React.ReactNode }) {
  return <div className="relative w-full">{children}</div>;
}

type TileButtonProps = Omit<React.ComponentProps<"button">, "type"> & {
  tileVariant: NonNullable<TileVariantProps["variant"]>;
  busy?: boolean;
};

type TilePanelProps = {
  tileVariant: NonNullable<TileVariantProps["variant"]>;
  children: React.ReactNode;
};

function TilePanel(props: TilePanelProps) {
  const { tileVariant, children } = props;

  return <div className={tileVariants({ variant: tileVariant })}>{children}</div>;
}

function TileButton(props: TileButtonProps) {
  const { tileVariant, busy = false, className, disabled, children, ...rest } = props;
  const showBusy = useDeferredLoadingIndicator(busy);

  return (
    <button
      type="button"
      className={cn(
        tileVariants({ variant: tileVariant }),
        "cursor-pointer disabled:cursor-not-allowed",
        busy && "pointer-events-none opacity-60",
        className
      )}
      disabled={disabled}
      aria-busy={showBusy}
      {...rest}
    >
      {children}
      {showBusy ? <TileBusyOverlay /> : null}
    </button>
  );
}

function TileBusyOverlay() {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-card/80">
      <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
    </span>
  );
}

type TileOverlayButtonProps = React.ComponentProps<typeof Button> & VariantProps<typeof tileOverlayButtonVariants>;

function TileOverlayButton(props: TileOverlayButtonProps) {
  const { intent = "menu", className, ...rest } = props;

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      className={cn(tileOverlayButtonVariants({ intent }), className)}
      {...rest}
    />
  );
}

function TileBottomPinnedLabel(props: { children: React.ReactNode; reserveActionSpace?: boolean }) {
  const { children, reserveActionSpace = false } = props;

  return <span className={tileBottomPinnedLabelVariants({ reserveActionSpace })}>{children}</span>;
}

function TilePresetContent(props: { title: string; meta: string }) {
  const { title, meta } = props;

  return (
    <>
      <span className={tilePresetTitleClass}>{title}</span>
      <span className={tilePresetMetaClass}>{meta}</span>
    </>
  );
}

export {
  TileBottomPinnedLabel,
  TileBusyOverlay,
  TileButton,
  TileGridListItem,
  TileOverlayButton,
  TilePanel,
  TilePresetContent,
  TileSurface,
};
