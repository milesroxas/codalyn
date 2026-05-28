import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid w-full gap-2", className)} {...props} />;
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 cursor-pointer rounded-sm border border-input outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-4 items-center justify-center"
      >
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-primary-foreground" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

const radioGroupTileGridClass = "grid grid-cols-3 gap-1.5";

/** Three-column grid for icon tile radio choices (e.g. theme picker). */
function RadioGroupTileGrid({ className, ...props }: React.ComponentProps<typeof RadioGroup>) {
  return <RadioGroup className={cn(radioGroupTileGridClass, className)} {...props} />;
}

const radioGroupTileOptionClass =
  "relative flex min-h-0 min-w-0 cursor-pointer flex-col items-center gap-1 rounded-sm border border-border/80 bg-muted/20 p-2 pt-5 text-center transition-colors hover:bg-muted/35 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/40 has-[[data-state=checked]]:shadow-sm";

function RadioGroupTileOption({
  className,
  htmlFor,
  children,
  ...props
}: React.ComponentProps<"label"> & { htmlFor: string }) {
  return (
    <label
      htmlFor={htmlFor}
      data-slot="radio-group-tile-option"
      className={cn(radioGroupTileOptionClass, className)}
      {...props}
    >
      {children}
    </label>
  );
}

const radioGroupTileOptionControlClass = "absolute top-1.5 right-1.5";

function RadioGroupTileOptionControl({ className, ...props }: React.ComponentProps<typeof RadioGroupItem>) {
  return (
    <RadioGroupItem
      data-slot="radio-group-tile-option-control"
      className={cn(radioGroupTileOptionControlClass, className)}
      {...props}
    />
  );
}

const radioGroupTileOptionIconClass = "size-5 shrink-0 text-muted-foreground";
const radioGroupTileOptionCopyClass = "flex min-w-0 flex-col gap-0.5";
const radioGroupTileOptionTitleClass = "text-xs leading-tight font-medium";
const radioGroupTileOptionDescriptionClass = "text-muted-foreground text-xs leading-snug";

function RadioGroupTileOptionIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="radio-group-tile-option-icon"
      className={cn(radioGroupTileOptionIconClass, className)}
      {...props}
    />
  );
}

function RadioGroupTileOptionCopy({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="radio-group-tile-option-copy" className={cn(radioGroupTileOptionCopyClass, className)} {...props} />
  );
}

function RadioGroupTileOptionTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="radio-group-tile-option-title"
      className={cn(radioGroupTileOptionTitleClass, className)}
      {...props}
    />
  );
}

function RadioGroupTileOptionDescription({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="radio-group-tile-option-description"
      className={cn(radioGroupTileOptionDescriptionClass, className)}
      {...props}
    />
  );
}

export {
  RadioGroup,
  RadioGroupItem,
  RadioGroupTileGrid,
  RadioGroupTileOption,
  RadioGroupTileOptionControl,
  RadioGroupTileOptionCopy,
  RadioGroupTileOptionDescription,
  RadioGroupTileOptionIcon,
  RadioGroupTileOptionTitle,
};
