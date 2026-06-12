import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

const emptyVariants = cva("group/empty flex min-w-0 flex-1 text-balance", {
  variants: {
    tone: {
      default: "",
      plain: "",
      /** Inset panel empty state (CMS Slots Designer / Composer sections). */
      insetPanel: "rounded-[10px] border border-border bg-muted/10",
    },
    layout: {
      vertical: "flex-col",
      /** Icon left, title/description beside, action on the right. */
      horizontal: "flex-row items-center",
      /** Compact left-aligned stack: title, description, then action below. */
      horizontalStacked: "flex-col items-stretch",
    },
  },
  compoundVariants: [
    {
      tone: "default",
      layout: "vertical",
      class: "items-center justify-center gap-4 rounded-sm border border-dashed p-6 text-center",
    },
    {
      tone: "plain",
      layout: "vertical",
      class: "w-full items-stretch gap-4 border-0 bg-transparent p-0 text-left",
    },
    {
      tone: "insetPanel",
      layout: "vertical",
      class: "items-center justify-center gap-3 px-6 py-8 text-center min-h-28",
    },
    {
      tone: "insetPanel",
      layout: "horizontal",
      class: "gap-3 px-4 py-3 text-left",
    },
    {
      tone: "insetPanel",
      layout: "horizontalStacked",
      class: "gap-2.5 px-4 py-3 text-left",
    },
  ],
  defaultVariants: {
    tone: "default",
    layout: "vertical",
  },
});

function Empty({
  className,
  tone,
  layout,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyVariants>) {
  const resolvedLayout = layout ?? "vertical";
  return (
    <div
      data-slot="empty"
      data-layout={resolvedLayout}
      className={cn(emptyVariants({ tone, layout: resolvedLayout }), className)}
      {...props}
    />
  );
}

const emptyHeaderVariants = cva(
  "flex flex-col gap-2 group-data-[layout=horizontal]/empty:grid group-data-[layout=horizontal]/empty:min-w-0 group-data-[layout=horizontal]/empty:flex-1 group-data-[layout=horizontal]/empty:grid-cols-[auto_minmax(0,1fr)] group-data-[layout=horizontal]/empty:grid-rows-[auto_auto] group-data-[layout=horizontal]/empty:items-center group-data-[layout=horizontal]/empty:gap-x-3 group-data-[layout=horizontal]/empty:gap-y-0.5 group-data-[layout=horizontal]/empty:text-left group-data-[layout=horizontalStacked]/empty:w-full group-data-[layout=horizontalStacked]/empty:max-w-none group-data-[layout=horizontalStacked]/empty:items-start group-data-[layout=horizontalStacked]/empty:gap-1 group-data-[layout=horizontalStacked]/empty:text-left",
  {
    variants: {
      width: {
        default:
          "max-w-sm items-center group-data-[layout=horizontal]/empty:max-w-none group-data-[layout=horizontal]/empty:items-start group-data-[layout=horizontalStacked]/empty:max-w-none group-data-[layout=horizontalStacked]/empty:items-start",
        full: "w-full max-w-none items-center group-data-[layout=horizontal]/empty:items-start group-data-[layout=horizontalStacked]/empty:items-start",
      },
    },
    defaultVariants: {
      width: "default",
    },
  }
);

function EmptyHeader({
  className,
  width,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyHeaderVariants>) {
  return <div data-slot="empty-header" className={cn(emptyHeaderVariants({ width }), className)} {...props} />;
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center group-data-[layout=horizontal]/empty:col-start-1 group-data-[layout=horizontal]/empty:row-span-2 group-data-[layout=horizontal]/empty:row-start-1 group-data-[layout=horizontal]/empty:mb-0 group-data-[layout=horizontal]/empty:self-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
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
      className={cn(
        "font-heading text-sm font-medium tracking-tight group-data-[layout=horizontal]/empty:col-start-2 group-data-[layout=horizontal]/empty:row-start-1",
        className
      )}
      {...props}
    />
  );
}

const emptyDescriptionVariants = cva(
  "text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary [&>strong]:font-medium [&>strong]:text-primary",
  {
    variants: {
      size: {
        default: "text-sm/relaxed",
        compact:
          "max-w-56 text-xs leading-relaxed group-data-[layout=horizontal]/empty:max-w-none group-data-[layout=horizontalStacked]/empty:max-w-none",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

function EmptyDescription({
  className,
  size,
  ...props
}: React.ComponentProps<"p"> & VariantProps<typeof emptyDescriptionVariants>) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        emptyDescriptionVariants({ size }),
        "group-data-[layout=horizontal]/empty:col-start-2 group-data-[layout=horizontal]/empty:row-start-2",
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
      actions:
        "max-w-sm items-center gap-2 group-data-[layout=horizontal]/empty:w-auto group-data-[layout=horizontal]/empty:max-w-none group-data-[layout=horizontal]/empty:shrink-0 group-data-[layout=horizontalStacked]/empty:w-full group-data-[layout=horizontalStacked]/empty:max-w-none group-data-[layout=horizontalStacked]/empty:items-stretch",
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

function EmptyAction({
  className,
  width = "full",
  ...props
}: React.ComponentProps<typeof Button> & { width?: "full" | "fit" }) {
  return (
    <Button
      type="button"
      variant="emptyAction"
      size={width === "fit" ? "emptyActionFit" : "emptyAction"}
      className={className}
      {...props}
    />
  );
}

export { Empty, EmptyAction, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle };
