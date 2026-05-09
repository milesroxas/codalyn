import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
        headerMenu:
          "border border-border/55 bg-muted/90 px-3 text-[0.8125rem] font-medium shadow-none hover:bg-muted dark:border-white/14 dark:bg-muted dark:hover:bg-muted/85 [&_svg]:opacity-95",
        /** CMS Slots bottom dock: inactive route */
        cmsSlotsDockNav:
          "border-input/65 bg-muted/35 text-muted-foreground shadow-none hover:bg-muted/50 hover:text-foreground dark:border-white/14 dark:bg-black/55 dark:text-muted-foreground dark:hover:bg-white/12 dark:hover:text-foreground",
        /** CMS Slots bottom dock: active route (gradient + cyan bottom edge glow; themed via `--cms-slot-dock-*` in globals.css). */
        cmsSlotsDockNavActive:
          "border-[color-mix(in_oklab,var(--cms-slot-dock-accent-line)_48%,var(--border))] text-foreground shadow-[inset_0_-2px_10px_-3px_color-mix(in_oklab,var(--cms-slot-dock-accent-line)_35%,transparent),inset_0_-1px_0_0_var(--cms-slot-dock-accent-line)] [background-image:linear-gradient(to_bottom,var(--cms-slot-dock-active-top)_0%,var(--cms-slot-dock-active-bottom)_100%)] hover:brightness-[1.04]",
        /** CMS Slots full-width action row (e.g. Add Slot / Install). */
        cmsSlotsCard:
          "border-border/65 bg-muted/50 text-foreground shadow-none hover:bg-muted/65 dark:border-white/12 dark:bg-muted/35 dark:hover:bg-muted/50",
        /** Composer row title opens slot-name drawer; reads like muted text row line. */
        composerSlotTitle:
          "min-h-9 h-auto max-w-none w-full flex-1 justify-start truncate border-transparent bg-transparent px-1 py-1.5 text-left text-sm leading-snug font-medium shadow-none hover:bg-muted/70 focus-visible:bg-muted dark:hover:bg-muted/35 [&_svg]:size-4",
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
        /** Paired with `variant="cmsSlotsCard"` */
        cmsSlotsCard:
          "!h-auto min-h-11 w-full shrink-0 justify-between gap-3 rounded-md px-4 py-3.5 font-semibold whitespace-normal [&_svg:not([class*='size-'])]:size-5",
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
