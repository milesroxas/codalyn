import type * as React from "react";

import { cn } from "@/shared/lib/utils";

function FormField({
  className,
  span = "default",
  ...props
}: React.ComponentProps<"div"> & { span?: "default" | "full" }) {
  return (
    <div
      data-slot="form-field"
      className={cn("space-y-1.5", span === "full" && "sm:col-span-2", className)}
      {...props}
    />
  );
}

function FormFieldGrid({ className, grow = false, ...props }: React.ComponentProps<"div"> & { grow?: boolean }) {
  return (
    <div
      data-slot="form-field-grid"
      className={cn("grid gap-3 sm:grid-cols-2", grow && "min-w-0 flex-1", className)}
      {...props}
    />
  );
}

function FormInlineLayout({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form-inline-layout"
      className={cn("flex flex-col gap-4 lg:flex-row lg:items-start", className)}
      {...props}
    />
  );
}

function FormFieldAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form-field-action"
      className={cn("flex min-w-0 flex-col space-y-1.5 lg:shrink-0", className)}
      {...props}
    />
  );
}

function FormFieldActionLabelSpacer() {
  return (
    <span className="hidden text-sm font-medium leading-none select-none lg:block lg:invisible" aria-hidden>
      &nbsp;
    </span>
  );
}

function FormFieldRow({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="form-field-row" className={cn("flex gap-2", className)} {...props} />;
}

function FormFieldInset({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form-field-inset"
      className={cn("space-y-3 rounded-lg border border-dashed border-border/80 bg-background/50 p-3", className)}
      {...props}
    />
  );
}

export {
  FormField,
  FormFieldAction,
  FormFieldActionLabelSpacer,
  FormFieldGrid,
  FormFieldInset,
  FormFieldRow,
  FormInlineLayout,
};
