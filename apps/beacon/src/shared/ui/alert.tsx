import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

const alertVariants = cva(
  "group/alert relative grid w-full text-left has-[>svg]:grid-cols-[auto_1fr] *:[svg]:row-span-2 *:[svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        info: "border-border/80 bg-muted/35 text-foreground *:data-[slot=alert-description]:text-muted-foreground *:[svg]:text-muted-foreground",
        warning:
          "border-amber-500/35 bg-amber-500/10 text-foreground *:data-[slot=alert-description]:text-muted-foreground *:[svg]:text-amber-600 dark:*:[svg]:text-amber-400",
        destructive:
          "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
      },
      size: {
        default:
          "gap-0.5 rounded-sm border px-2.5 py-2 text-sm has-data-[alert-action-placement=corner]:pr-18 has-[>svg]:gap-x-2 *:[svg]:translate-y-0.5 *:[svg:not([class*='size-'])]:size-4",
        compact:
          "items-center gap-0 rounded-sm border px-2 py-2.5 text-xs has-data-[alert-action-placement=corner]:pr-11 has-[>svg]:grid-cols-[auto_minmax(0,1fr)] has-[>svg]:gap-x-1.5 data-[size=compact]:*:[svg]:row-span-1 data-[size=compact]:*:[svg]:self-center *:[svg]:translate-y-0 *:[svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Alert({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-size={size ?? "default"}
      role="alert"
      className={cn(alertVariants({ variant, size }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 group-data-[size=compact]/alert:min-w-0 group-data-[size=compact]/alert:self-center group-data-[size=compact]/alert:truncate group-data-[size=compact]/alert:leading-none [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  );
}

const alertActionVariants = cva("", {
  variants: {
    // `corner` floats a compact action top-right (reserves `pr-18` on the alert);
    // `block` keeps the action in the text column for wide actions / narrow panels where a
    // floated label would overlap the title.
    placement: {
      corner:
        "absolute top-1/2 right-2 -translate-y-1/2 group-data-[size=compact]/alert:right-1 group-data-[size=compact]/alert:flex group-data-[size=compact]/alert:items-center",
      block:
        "col-start-2 mt-2.5 flex flex-wrap items-center gap-2 group-data-[size=compact]/alert:mt-1 group-data-[size=compact]/alert:justify-end",
    },
  },
  defaultVariants: {
    placement: "corner",
  },
});

function AlertAction({
  className,
  placement = "corner",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertActionVariants>) {
  return (
    <div
      data-slot="alert-action"
      data-alert-action-placement={placement ?? "corner"}
      className={cn(alertActionVariants({ placement }), className)}
      {...props}
    />
  );
}

export { Alert, AlertAction, AlertDescription, AlertTitle };
