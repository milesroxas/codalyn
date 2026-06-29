import type { VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";
import type { formFieldVariants } from "@/shared/ui/form-field-styles";
import { Skeleton } from "@/shared/ui/skeleton";

const fieldHeightClass = {
  sm: "h-7",
  default: "h-8",
  toolbar: "h-9",
  lg: "h-10",
} as const satisfies Record<NonNullable<VariantProps<typeof formFieldVariants>["fieldSize"]>, string>;

type FormFieldSkeletonProps = {
  fieldSize?: NonNullable<VariantProps<typeof formFieldVariants>["fieldSize"]>;
  multiline?: boolean;
  hint?: boolean;
  labelWidth?: string;
  className?: string;
};

function FormFieldSkeleton({
  fieldSize = "default",
  multiline = false,
  hint = false,
  labelWidth = "w-24",
  className,
}: FormFieldSkeletonProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Skeleton className={cn("h-4", labelWidth)} />
      <Skeleton className={cn("w-full rounded-sm", multiline ? "h-20" : fieldHeightClass[fieldSize])} />
      {hint ? <Skeleton className="h-3 w-full max-w-xs" /> : null}
    </div>
  );
}

export { FormFieldSkeleton };
