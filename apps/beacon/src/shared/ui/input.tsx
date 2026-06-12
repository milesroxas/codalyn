"use client";

import { IconSearch, IconX } from "@tabler/icons-react";
import * as React from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

const inputClass =
  "h-8 w-full min-w-0 rounded-sm border border-input bg-transparent px-2.5 py-1 text-base text-foreground transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

const inputSearchRootClass = "relative overflow-visible py-0.5";
const inputSearchIconClass =
  "pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground";
const inputSearchFieldClass =
  "h-9 pl-9 pr-2.5 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden";
const inputSearchFieldWithClearClass = "pr-9";
const inputSearchClearButtonClass =
  "absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(inputClass, className)} {...props} />;
}

type InputSearchProps = React.ComponentProps<typeof Input>;

function InputSearch({
  className,
  type = "text",
  role = "searchbox",
  value,
  defaultValue,
  onChange,
  onPointerDown,
  ...props
}: InputSearchProps) {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "");
  const currentValue = isControlled ? String(value ?? "") : String(uncontrolledValue ?? "");
  const showClear = currentValue.length > 0;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setUncontrolledValue(event.target.value);
    }
    onChange?.(event);
  };

  const handleClear = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isControlled) {
      setUncontrolledValue("");
    }

    onChange?.({
      target: { value: "" },
      currentTarget: { value: "" },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div data-slot="input-search" className={inputSearchRootClass}>
      <IconSearch className={inputSearchIconClass} stroke={1.5} aria-hidden />
      <Input
        type={type}
        role={role}
        value={isControlled ? value : uncontrolledValue}
        defaultValue={isControlled ? undefined : defaultValue}
        onChange={handleChange}
        className={cn(inputSearchFieldClass, showClear && inputSearchFieldWithClearClass, className)}
        onPointerDown={(event) => {
          event.stopPropagation();
          onPointerDown?.(event);
        }}
        {...props}
      />
      {showClear ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={inputSearchClearButtonClass}
          onClick={handleClear}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Clear search"
        >
          <IconX stroke={1.5} aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

export { Input, InputSearch };
