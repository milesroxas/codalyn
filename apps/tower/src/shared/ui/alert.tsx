import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

const alertVariants = cva(
  "group/alert relative grid w-full gap-1 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3 *:[svg]:row-span-2 *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        info: "border-border/80 bg-muted/35 text-foreground *:data-[slot=alert-description]:text-muted-foreground *:[svg]:text-muted-foreground",
        warning:
          "border-amber-500/35 bg-amber-500/10 text-foreground *:data-[slot=alert-description]:text-muted-foreground *:[svg]:text-amber-600 dark:*:[svg]:text-amber-400",
        destructive:
          "border-destructive/35 bg-destructive/10 text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium leading-none tracking-tight group-has-[>svg]/alert:col-start-2 has-[+_[data-slot=alert-description]]:mb-1 [&_a]:underline [&_a]:underline-offset-3",
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
        "text-sm text-muted-foreground group-has-[>svg]/alert:col-start-2 [&_p:not(:last-child)]:mb-2",
        className
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("mt-3 flex flex-wrap gap-2 group-has-[>svg]/alert:col-start-2", className)}
      {...props}
    />
  );
}

export { Alert, AlertAction, AlertDescription, AlertTitle };
