import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-6", className)} {...props} />;
}

const tabsListVariants = cva("inline-flex items-center gap-1 rounded-sm bg-muted/80 p-1 text-muted-foreground", {
  variants: {
    variant: {
      default: "h-9 w-fit flex-wrap justify-start",
      // Full-width segmented toggle with equal-width, larger triggers.
      segmented:
        "h-11 w-full [&>[data-slot=tabs-trigger]]:h-9 [&>[data-slot=tabs-trigger]]:flex-1 [&>[data-slot=tabs-trigger]]:text-sm",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function TabsList({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List data-slot="tabs-list" className={cn(tabsListVariants({ variant }), className)} {...props} />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex min-h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm [&_svg]:size-3.5",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
