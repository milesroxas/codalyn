import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { formFieldSharedClass, formFieldSurfaceClass } from "@/shared/ui/form-field-styles";

const textareaVariants = cva(cn(formFieldSharedClass, "flex field-sizing-content resize-y py-2 transition-colors"), {
  variants: {
    fieldSize: {
      default: "min-h-16 px-2.5 text-sm",
      lg: "min-h-20 px-3 text-sm",
    },
    surface: {
      default: formFieldSurfaceClass.default,
      elevated: formFieldSurfaceClass.elevated,
    },
  },
  defaultVariants: {
    fieldSize: "default",
    surface: "default",
  },
});

function Textarea({
  className,
  fieldSize,
  surface,
  ...props
}: React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>) {
  return (
    <textarea data-slot="textarea" className={cn(textareaVariants({ fieldSize, surface }), className)} {...props} />
  );
}

export { Textarea };
