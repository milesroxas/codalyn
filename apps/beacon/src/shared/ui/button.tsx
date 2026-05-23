import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        /** Route step breadcrumb: active step in the pinned subheader strip. */
        stepNavCurrent: "text-foreground font-semibold no-underline hover:no-underline shadow-none",
        /** Route step breadcrumb: completed step (back navigation). */
        stepNavPast: "text-muted-foreground shadow-none",
        /** Route step breadcrumb: upcoming step. */
        stepNavUpcoming: "pointer-events-none text-muted-foreground/50 opacity-80 shadow-none",
        headerMenu:
          "border border-border/55 bg-muted/90 px-3 text-[0.8125rem] font-medium shadow-none hover:bg-muted dark:border-white/14 dark:bg-muted dark:hover:bg-muted/85 [&_svg]:opacity-95",
        /** Route footer dock: muted (inactive nav tab, idle action). */
        routeDockMuted:
          "border-input/65 bg-muted/35 text-muted-foreground shadow-none hover:bg-muted/50 hover:text-foreground dark:border-border dark:bg-muted/55 dark:hover:bg-muted/70 dark:hover:text-foreground",
        /** Route footer dock: active (selected tab, emphasized action; `--beacon-route-dock-*` in globals.css). */
        routeDockActive:
          "border-[color-mix(in_oklab,var(--beacon-route-dock-accent-line)_48%,var(--border))] text-foreground shadow-[inset_0_-2px_10px_-3px_color-mix(in_oklab,var(--beacon-route-dock-accent-line)_35%,transparent),inset_0_-1px_0_0_var(--beacon-route-dock-accent-line)] [background-image:linear-gradient(to_bottom,var(--beacon-route-dock-active-top)_0%,var(--beacon-route-dock-active-bottom)_100%)] hover:brightness-[1.04]",
        /** Full-width action row (e.g. Add Slot / Install / Scan page). */
        actionCard:
          "border-border/65 bg-muted/50 text-foreground shadow-none hover:bg-muted/65 dark:bg-muted/35 dark:hover:bg-muted/50",
        /** Composer row title opens slot-name drawer; reads like muted text row line. */
        composerSlotTitle:
          "min-h-9 h-auto max-w-none w-full flex-1 justify-start truncate border-transparent bg-transparent px-1 py-1.5 text-left text-sm leading-snug font-medium shadow-none hover:bg-muted/70 focus-visible:bg-muted dark:hover:bg-muted/35 [&_svg]:size-4",
        /** Composer palette: grid tile for adding a component type. */
        composerPaletteTile:
          "border-border/70 bg-muted/90 text-foreground shadow-none hover:bg-muted dark:bg-muted/50 dark:hover:bg-muted/65",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-sm px-2 text-xs in-data-[slot=button-group]:rounded-sm has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-sm px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-sm has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs": "size-6 rounded-sm in-data-[slot=button-group]:rounded-sm [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-sm in-data-[slot=button-group]:rounded-sm",
        "icon-lg": "size-9",
        /** CMS Slots Engine / Composer / Sync dock */
        dockNav: "h-9 min-h-9 gap-2 px-3 py-2 text-[0.8125rem]",
        /** Route step breadcrumb labels and links in the pinned subheader strip. */
        stepNav: "h-7 min-w-0 gap-0 px-1.5 text-[11px]",
        /** Paired with `variant="actionCard"` */
        actionCard:
          "!h-auto min-h-11 w-full shrink-0 justify-center gap-2 rounded-md px-4 py-3.5 font-medium whitespace-normal",
        /** Paired with `variant="composerPaletteTile"` */
        composerPaletteTile:
          "!h-auto min-h-[4.25rem] w-full max-w-none shrink-0 justify-center gap-0 rounded-md px-2 py-2.5 text-[0.8125rem] font-medium leading-tight whitespace-normal",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
