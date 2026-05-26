import type * as React from "react";

import { cn } from "@/shared/lib/utils";

type CardLayout = "default" | "fill" | "table-section";

function Card({
  className,
  size = "default",
  layout = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm"; layout?: CardLayout }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-layout={layout}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[layout=fill]:h-full data-[layout=table-section]:gap-0 data-[layout=table-section]:py-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 data-[size=sm]:data-[layout=table-section]:gap-0 data-[size=sm]:data-[layout=table-section]:py-0 data-[layout=table-section]:[&_[data-slot=table-header]]:bg-muted/20 data-[layout=table-section]:[&_[data-slot=table-header]_tr]:border-border data-[layout=table-section]:[&_[data-slot=table-header]_tr]:hover:bg-transparent data-[layout=table-section]:[&_[data-slot=table-head]:first-child]:pl-4 data-[layout=table-section]:[&_[data-slot=table-head]:last-child]:pr-4 data-[layout=table-section]:[&_[data-slot=table-head]]:py-3 data-[layout=table-section]:[&_[data-slot=table-head]]:uppercase data-[layout=table-section]:[&_[data-slot=table-head]]:tracking-wide data-[layout=table-section]:[&_[data-slot=table-cell]:first-child]:pl-4 data-[layout=table-section]:[&_[data-slot=table-cell]:last-child]:pr-4 data-[layout=table-section]:[&_[data-slot=table-cell]]:py-3 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className
      )}
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

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-base leading-snug font-medium group-data-[size=sm]/card:text-sm group-data-[layout=table-section]/card:text-base",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
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
