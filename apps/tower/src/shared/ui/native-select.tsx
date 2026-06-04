import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { formFieldVariants } from "@/shared/ui/form-field-styles";

const nativeSelectVariants = cva("", {
  variants: {
    fieldWidth: {
      default: "",
      role: "min-w-28",
    },
  },
  defaultVariants: {
    fieldWidth: "default",
  },
});

function NativeSelect({
  className,
  fieldSize,
  surface,
  fieldWidth,
  ...props
}: Omit<React.ComponentProps<"select">, "size"> &
  VariantProps<typeof formFieldVariants> &
  VariantProps<typeof nativeSelectVariants>) {
  return (
    <select
      data-slot="native-select"
      className={cn(formFieldVariants({ fieldSize, surface }), nativeSelectVariants({ fieldWidth }), className)}
      {...props}
    />
  );
}

export { NativeSelect };
