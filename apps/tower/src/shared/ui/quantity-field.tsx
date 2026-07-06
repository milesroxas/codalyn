"use client";

import { IconMinus, IconPlus } from "@tabler/icons-react";
import type * as React from "react";

import { Button } from "@/shared/ui/button";
import { ButtonGroup } from "@/shared/ui/button-group";
import { Input } from "@/shared/ui/input";

function parseQuantity(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampQuantity(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeQuantityInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

function normalizeQuantityValue(value: string, min: number, max: number): string {
  if (value === "") {
    return String(min);
  }
  const parsed = parseQuantity(value);
  if (parsed === null) {
    return String(min);
  }
  return String(clampQuantity(parsed, min, max));
}

type QuantityFieldProps = {
  id: string;
  name?: string;
  value: string;
  onValueChange: (next: string) => void;
  min: number;
  max: number;
  disabled?: boolean;
} & Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "min" | "max" | "disabled" | "onBlur" | "onKeyDown" | "role"
>;

export function QuantityField(props: QuantityFieldProps) {
  const { id, name, value, onValueChange, min, max, disabled = false, required, ...inputProps } = props;
  const parsed = parseQuantity(value);
  const effective = parsed === null ? min : clampQuantity(parsed, min, max);

  const stepBy = (delta: number) => onValueChange(String(clampQuantity(effective + delta, min, max)));

  return (
    <ButtonGroup layout="quantity">
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || effective <= min}
        aria-label="Decrease quantity"
        tabIndex={-1}
        onClick={() => stepBy(-1)}
      >
        <IconMinus aria-hidden />
      </Button>
      <Input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={value}
        disabled={disabled}
        required={required}
        numeric
        stepperHidden
        role="spinbutton"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={effective}
        onChange={(event) => onValueChange(sanitizeQuantityInput(event.target.value))}
        onBlur={() => onValueChange(normalizeQuantityValue(value, min, max))}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            stepBy(1);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            stepBy(-1);
          }
        }}
        {...inputProps}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || effective >= max}
        aria-label="Increase quantity"
        tabIndex={-1}
        onClick={() => stepBy(1)}
      >
        <IconPlus aria-hidden />
      </Button>
    </ButtonGroup>
  );
}
