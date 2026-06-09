import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

const formFieldHintVariants = cva("text-muted-foreground", {
  variants: {
    size: {
      sm: "text-xs",
      md: "text-sm",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

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

function FormFieldGrid({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="form-field-grid" className={cn("grid gap-3 sm:grid-cols-2", className)} {...props} />;
}

function FormFieldRow({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="form-field-row" className={cn("flex gap-2", className)} {...props} />;
}

function FormFieldHint({
  className,
  size,
  ...props
}: React.ComponentProps<"p"> & VariantProps<typeof formFieldHintVariants>) {
  return <p data-slot="form-field-hint" className={cn(formFieldHintVariants({ size }), className)} {...props} />;
}

function FormSubmitRow({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="form-submit-row" className={cn("flex flex-wrap items-end gap-3", className)} {...props} />;
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

export { FormField, FormFieldGrid, FormFieldHint, FormFieldInset, FormFieldRow, FormSubmitRow };
