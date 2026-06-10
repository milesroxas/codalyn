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
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type" | "min" | "max" | "disabled" | "onBlur">;

export function QuantityField(props: QuantityFieldProps) {
  const { id, name, value, onValueChange, min, max, disabled = false, required, ...inputProps } = props;
  const parsed = parseQuantity(value);
  const effective = parsed === null ? min : clampQuantity(parsed, min, max);

  return (
    <ButtonGroup layout="quantity">
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        disabled={disabled || effective <= min}
        aria-label="Decrease quantity"
        onClick={() => onValueChange(String(clampQuantity(effective - 1, min, max)))}
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
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={effective}
        onChange={(event) => onValueChange(sanitizeQuantityInput(event.target.value))}
        onBlur={() => onValueChange(normalizeQuantityValue(value, min, max))}
        {...inputProps}
      />
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        disabled={disabled || effective >= max}
        aria-label="Increase quantity"
        onClick={() => onValueChange(String(clampQuantity(effective + 1, min, max)))}
      >
        <IconPlus aria-hidden />
      </Button>
    </ButtonGroup>
  );
}
