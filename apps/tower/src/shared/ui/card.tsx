import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

type CardLayout = "default" | "fill" | "table-section";

const cardVariants = cva(
  "group/card flex flex-col gap-4 overflow-hidden rounded-sm bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[layout=fill]:h-full data-[layout=table-section]:gap-0 data-[layout=table-section]:py-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 data-[size=sm]:data-[layout=table-section]:gap-0 data-[size=sm]:data-[layout=table-section]:py-0 data-[layout=table-section]:[&_[data-slot=table-header]]:bg-muted/20 data-[layout=table-section]:[&_[data-slot=table-header]_tr]:border-border data-[layout=table-section]:[&_[data-slot=table-header]_tr]:hover:bg-transparent data-[layout=table-section]:[&_[data-slot=table-head]:first-child]:pl-4 data-[layout=table-section]:[&_[data-slot=table-head]:last-child]:pr-4 data-[layout=table-section]:[&_[data-slot=table-head]]:py-3 data-[layout=table-section]:[&_[data-slot=table-head]]:uppercase data-[layout=table-section]:[&_[data-slot=table-head]]:tracking-wide data-[layout=table-section]:[&_[data-slot=table-cell]:first-child]:pl-4 data-[layout=table-section]:[&_[data-slot=table-cell]:last-child]:pr-4 data-[layout=table-section]:[&_[data-slot=table-cell]]:py-3 *:[img:first-child]:rounded-t-sm *:[img:last-child]:rounded-b-sm",
  {
    variants: {
      tone: {
        default: "",
        destructive: "bg-destructive/5 ring-destructive/30",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  }
);

const cardTitleVariants = cva(
  "leading-snug font-medium group-data-[size=sm]/card:text-sm group-data-[layout=table-section]/card:text-base",
  {
    variants: {
      size: {
        default: "text-base",
        lg: "text-lg",
      },
      tone: {
        default: "",
        destructive: "text-destructive",
      },
    },
    defaultVariants: {
      size: "default",
      tone: "default",
    },
  }
);

const cardDescriptionVariants = cva("text-sm text-muted-foreground", {
  variants: {
    tone: {
      default: "",
      destructive: "text-xs leading-relaxed text-destructive",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const cardActionVariants = cva("col-start-2 row-span-2 row-start-1 justify-self-end", {
  variants: {
    align: {
      start: "self-start",
      center: "self-center",
    },
    group: {
      false: "",
      true: "flex flex-wrap gap-2",
    },
  },
  defaultVariants: {
    align: "start",
    group: false,
  },
});

function Card({
  className,
  size = "default",
  layout = "default",
  tone = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm";
  layout?: CardLayout;
  tone?: VariantProps<typeof cardVariants>["tone"];
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-layout={layout}
      data-tone={tone}
      className={cn(cardVariants({ tone }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-4 group-data-[size=sm]/card:px-3 group-data-[layout=table-section]/card:px-4 group-data-[layout=table-section]/card:border-b group-data-[layout=table-section]/card:py-4 group-data-[layout=table-section]/card:pb-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({
  className,
  size = "default",
  tone = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardTitleVariants>) {
  return <div data-slot="card-title" className={cn(cardTitleVariants({ size, tone }), className)} {...props} />;
}

function CardDescription({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardDescriptionVariants>) {
  return <div data-slot="card-description" className={cn(cardDescriptionVariants({ tone }), className)} {...props} />;
}

function CardAction({
  className,
  align = "start",
  group = false,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardActionVariants>) {
  return <div data-slot="card-action" className={cn(cardActionVariants({ align, group }), className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "px-4 group-data-[size=sm]/card:px-3 group-data-[layout=fill]/card:flex-1 group-data-[layout=table-section]/card:p-0",
        className
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3", className)}
      {...props}
    />
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
