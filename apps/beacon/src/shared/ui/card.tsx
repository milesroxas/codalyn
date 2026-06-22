import type * as React from "react";

import { cn } from "@/shared/lib/utils";

function Card({
  className,
  size = "default",
  tone = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm"; tone?: "default" | "warning" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-tone={tone}
      className={cn(
        "group/card flex min-w-0 flex-col gap-4 overflow-hidden rounded-sm bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-sm *:[img:last-child]:rounded-b-sm",
        // Subtle warning notice — amber wash + ring, never a heavy fill.
        "data-[tone=warning]:bg-amber-500/10 data-[tone=warning]:ring-amber-500/30",
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
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-sm px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
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
      className={cn("font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-4 group-data-[size=sm]/card:px-3", className)} {...props} />;
}

const formFieldsCardContentClass = "flex min-w-0 flex-col gap-4 pt-0";

/** Compact card shell for stacked form controls (inputs, selects, checkboxes). */
function FormFieldsCard(props: { children: React.ReactNode }) {
  return (
    <Card size="sm" data-slot="form-fields-card">
      <CardContent data-slot="form-fields-card-content" className={formFieldsCardContentClass}>
        {props.children}
      </CardContent>
    </Card>
  );
}

export { Card, CardContent, CardDescription, CardHeader, CardTitle, FormFieldsCard };
