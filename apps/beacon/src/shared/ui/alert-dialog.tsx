"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { ScrollArea } from "@/shared/ui/scroll-area";

function AlertDialog({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  );
}

const alertDialogContentVariants = cva(
  "group/alert-dialog-content fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
  {
    variants: {
      size: {
        default: "max-w-xs sm:max-w-sm",
        sm: "max-w-xs",
      },
      layout: {
        default: "grid gap-4 rounded-sm bg-popover p-4",
        scroll:
          "grid max-h-[min(90vh,600px)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-sm bg-popover p-0",
      },
    },
    defaultVariants: {
      size: "default",
      layout: "default",
    },
  }
);

function AlertDialogContent({
  className,
  size = "default",
  layout = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> &
  VariantProps<typeof alertDialogContentVariants> & {
    size?: "default" | "sm";
  }) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        data-size={size}
        data-layout={layout}
        className={cn(alertDialogContentVariants({ size, layout }), className)}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "grid grid-rows-[auto_1fr] place-items-start gap-1.5 text-left has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4 sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
        "group-data-[layout=scroll]/alert-dialog-content:shrink-0 group-data-[layout=scroll]/alert-dialog-content:bg-popover group-data-[layout=scroll]/alert-dialog-content:px-4 group-data-[layout=scroll]/alert-dialog-content:pt-4 group-data-[layout=scroll]/alert-dialog-content:pb-3 group-data-[layout=scroll]/alert-dialog-content:relative group-data-[layout=scroll]/alert-dialog-content:z-10",
        className
      )}
      {...props}
    />
  );
}

const alertDialogFooterVariants = cva("", {
  variants: {
    layout: {
      default:
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-sm border-t bg-muted/50 p-4 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
      sticky: "relative z-10 mt-0 flex shrink-0 flex-col gap-2 border-t border-border bg-popover px-4 pt-4 pb-4",
    },
  },
  defaultVariants: {
    layout: "default",
  },
});

function AlertDialogFooter({
  className,
  layout,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertDialogFooterVariants>) {
  return (
    <div data-slot="alert-dialog-footer" className={cn(alertDialogFooterVariants({ layout }), className)} {...props} />
  );
}

const alertDialogScrollBodyRegionClass = "h-full min-h-0 overflow-hidden";
const alertDialogScrollBodyScrollAreaClass = "h-full min-h-0 w-full";

const alertDialogScrollBodyVariants = cva("px-4 pb-2", {
  variants: {
    spacing: {
      default: "space-y-3",
      form: "space-y-4",
    },
  },
  defaultVariants: {
    spacing: "default",
  },
});

function AlertDialogScrollBody({
  className,
  spacing,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertDialogScrollBodyVariants>) {
  return (
    <div className={alertDialogScrollBodyRegionClass} data-slot="alert-dialog-scroll-body">
      <ScrollArea className={alertDialogScrollBodyScrollAreaClass} data-slot="alert-dialog-scroll-body_scroll">
        <div className={cn(alertDialogScrollBodyVariants({ spacing }), className)} {...props} />
      </ScrollArea>
    </div>
  );
}

const alertDialogScrollSectionVariants = cva("", {
  variants: {
    divider: {
      true: "space-y-3 border-t border-border/50 pt-3",
      false: "",
    },
  },
  defaultVariants: {
    divider: false,
  },
});

function AlertDialogScrollSection({
  className,
  divider,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertDialogScrollSectionVariants>) {
  return (
    <div
      data-slot="alert-dialog-scroll-section"
      className={cn(alertDialogScrollSectionVariants({ divider }), className)}
      {...props}
    />
  );
}

function AlertDialogFormField(props: {
  label: React.ReactNode;
  labelHtmlFor: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { label, labelHtmlFor, meta, children } = props;

  return (
    <div className="space-y-0.5" data-slot="alert-dialog-form-field">
      <Label className="text-xs text-muted-foreground" htmlFor={labelHtmlFor}>
        <span className="min-w-0 truncate">{label}</span>
        {meta != null ? (
          <span className="ml-auto text-[10px] text-muted-foreground/70" data-slot="alert-dialog-form-field-meta">
            {meta}
          </span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

function AlertDialogMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "mb-2 inline-flex size-10 items-center justify-center rounded-sm bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "font-heading text-base font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(
        "text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Action data-slot="alert-dialog-action" className={cn(className)} {...props} />
    </Button>
  );
}

function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Cancel data-slot="alert-dialog-cancel" className={cn(className)} {...props} />
    </Button>
  );
}

const alertDialogFactPanelClass =
  "flex w-full min-w-0 flex-col gap-3 rounded-md border border-border/70 bg-muted/25 px-3 py-2.5 text-left";
const alertDialogFactClass = "flex min-w-0 flex-col gap-0.5";
const alertDialogFactLabelClass = "text-[10px] font-medium uppercase tracking-wide text-muted-foreground";
const alertDialogFactValueClass = "text-sm font-semibold tabular-nums text-foreground";
const alertDialogFactHintClass = "text-muted-foreground text-sm leading-snug";

function AlertDialogFactPanel({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-fact-panel" className={cn(alertDialogFactPanelClass, className)} {...props} />;
}

function AlertDialogFact({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-fact" className={cn(alertDialogFactClass, className)} {...props} />;
}

function AlertDialogFactLabel({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="alert-dialog-fact-label" className={cn(alertDialogFactLabelClass, className)} {...props} />;
}

function AlertDialogFactValue({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="alert-dialog-fact-value" className={cn(alertDialogFactValueClass, className)} {...props} />;
}

function AlertDialogFactHint({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="alert-dialog-fact-hint" className={cn(alertDialogFactHintClass, className)} {...props} />;
}

const alertDialogScrollContentDefaults = {
  size: "default",
  layout: "scroll",
} as const;

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFact,
  AlertDialogFactHint,
  AlertDialogFactLabel,
  AlertDialogFactPanel,
  AlertDialogFactValue,
  AlertDialogFooter,
  AlertDialogFormField,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogScrollBody,
  AlertDialogScrollSection,
  AlertDialogTitle,
  AlertDialogTrigger,
  alertDialogScrollContentDefaults,
};
