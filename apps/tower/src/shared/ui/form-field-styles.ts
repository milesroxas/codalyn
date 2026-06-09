import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

/** Shared focus treatment for single-target form controls (input, select, textarea). */
export const formFieldFocusClass =
  "outline-none transition-[color,box-shadow,border-color] focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/25";

/** Shared focus treatment for composite controls that delegate focus to children. */
export const formFieldFocusWithinClass =
  "outline-none transition-[color,box-shadow,border-color] focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/25";

export const formFieldInvalidClass =
  "aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/30";

const formFieldDisabledClass =
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-input/50 dark:disabled:bg-input/80";

export const formFieldSurfaceClass = {
  default: "bg-transparent dark:bg-input/30",
  elevated: "bg-background/80 shadow-xs dark:bg-input/40",
} as const;

export const formFieldSharedClass = cn(
  "w-full min-w-0 rounded-lg border border-input text-foreground placeholder:text-muted-foreground",
  formFieldFocusClass,
  formFieldInvalidClass,
  formFieldDisabledClass
);

export const formFieldVariants = cva(formFieldSharedClass, {
  variants: {
    fieldSize: {
      sm: "h-7 px-2 text-xs",
      default: "h-8 px-2.5 py-1 text-sm",
      toolbar: "h-9 px-2.5 py-1 text-sm",
      lg: "h-10 px-3 py-2 text-sm",
    },
    surface: {
      default: formFieldSurfaceClass.default,
      elevated: formFieldSurfaceClass.elevated,
    },
    numeric: {
      true: "tabular-nums",
      false: "",
    },
    mono: {
      true: "font-mono",
      false: "",
    },
    leadingIcon: {
      true: "pl-8",
      false: "",
    },
    width: {
      default: "",
      filter: "w-36",
    },
    stepperHidden: {
      true: "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
      false: "",
    },
  },
  defaultVariants: {
    fieldSize: "default",
    surface: "default",
    numeric: false,
    mono: false,
    leadingIcon: false,
    width: "default",
    stepperHidden: false,
  },
});

export type FormFieldVariantProps = VariantProps<typeof formFieldVariants>;
