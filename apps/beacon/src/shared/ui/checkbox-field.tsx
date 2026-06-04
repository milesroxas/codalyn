import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";

const checkboxFieldVariants = cva("flex items-start gap-2.5 text-sm");

/** Matches the first-line box for `text-sm` so the control aligns with label cap height. */
const checkboxFieldControlVariants = cva("flex shrink-0 items-center self-start", {
  variants: {
    size: {
      default: "h-5",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const checkboxFieldLabelVariants = cva("min-w-0 flex-1 cursor-pointer font-normal leading-5 text-foreground");

const checkboxFieldMetaVariants = cva("ml-1 font-mono text-xs text-muted-foreground");

function CheckboxFieldList({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="checkbox-field-list" className={cn("m-0 list-none space-y-2.5 p-0", className)} {...props} />;
}

function CheckboxFieldItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="checkbox-field-item" className={cn(className)} {...props} />;
}

function CheckboxFieldMeta({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="checkbox-field-meta" className={cn(checkboxFieldMetaVariants(), className)} {...props} />;
}

type CheckboxFieldProps = Omit<React.ComponentProps<"div">, "onChange"> &
  VariantProps<typeof checkboxFieldVariants> & {
    id: string;
    label: React.ReactNode;
    meta?: React.ReactNode;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange: (checked: boolean) => void;
  };

function CheckboxField(props: CheckboxFieldProps) {
  const { id, label, meta, checked, disabled, onCheckedChange, className, ...rest } = props;

  return (
    <div data-slot="checkbox-field" className={cn(checkboxFieldVariants(), className)} {...rest}>
      <div data-slot="checkbox-field-control" className={checkboxFieldControlVariants()}>
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => {
            if (value === "indeterminate") {
              return;
            }
            onCheckedChange(value === true);
          }}
        />
      </div>
      <Label htmlFor={id} className={checkboxFieldLabelVariants()}>
        {label}
        {meta != null ? <CheckboxFieldMeta>{meta}</CheckboxFieldMeta> : null}
      </Label>
    </div>
  );
}

export { CheckboxField, CheckboxFieldItem, CheckboxFieldList };
