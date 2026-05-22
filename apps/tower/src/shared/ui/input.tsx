import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { formFieldVariants } from "@/shared/ui/form-field-styles";

const inputSpecificClass =
  "min-w-0 text-base transition-colors file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground md:text-sm";

function Input({
  className,
  type,
  fieldSize,
  surface,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof formFieldVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(formFieldVariants({ fieldSize, surface }), inputSpecificClass, className)}
      {...props}
    />
  );
}

export { formFieldVariants as inputVariants, Input };
