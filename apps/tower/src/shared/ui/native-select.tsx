import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { formFieldVariants } from "@/shared/ui/form-field-styles";

function NativeSelect({
  className,
  fieldSize,
  surface,
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & VariantProps<typeof formFieldVariants>) {
  return (
    <select
      data-slot="native-select"
      className={cn(formFieldVariants({ fieldSize, surface }), className)}
      {...props}
    />
  );
}

export { NativeSelect };
