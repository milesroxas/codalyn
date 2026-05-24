import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

const emptyVariants = cva("flex min-w-0 flex-1 flex-col gap-4 text-balance", {
  variants: {
    tone: {
      default: "items-center justify-center rounded-sm border border-dashed p-6 text-center",
      plain: "w-full items-stretch border-0 bg-transparent p-0 text-left",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

function Empty({ className, tone, ...props }: React.ComponentProps<"div"> & VariantProps<typeof emptyVariants>) {
  return <div data-slot="empty" className={cn(emptyVariants({ tone }), className)} {...props} />;
}

const emptyHeaderVariants = cva("flex flex-col gap-2", {
  variants: {
    width: {
      default: "max-w-sm items-center",
      full: "w-full max-w-none items-center",
    },
  },
  defaultVariants: {
    width: "default",
  },
});

function EmptyHeader({
  className,
  width,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyHeaderVariants>) {
  return <div data-slot="empty-header" className={cn(emptyHeaderVariants({ width }), className)} {...props} />;
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "flex size-8 shrink-0 items-center justify-center rounded-sm bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn("font-heading text-sm font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary [&>strong]:font-medium [&>strong]:text-primary",
        className
      )}
      {...props}
    />
  );
}

const emptyContentVariants = cva("flex w-full min-w-0 flex-col text-sm text-balance", {
  variants: {
    layout: {
      default: "max-w-sm items-center gap-2.5",
      hint: "max-w-none items-stretch gap-2.5 text-left",
      actions: "max-w-sm items-center gap-2",
    },
  },
  defaultVariants: {
    layout: "default",
  },
});

function EmptyContent({
  className,
  layout,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyContentVariants>) {
  return <div data-slot="empty-content" className={cn(emptyContentVariants({ layout }), className)} {...props} />;
}

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle };
