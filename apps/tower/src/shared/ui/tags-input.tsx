"use client";

import { IconX } from "@tabler/icons-react";
import { type ClipboardEvent, type FocusEvent, type KeyboardEvent, useRef } from "react";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import {
  type FormFieldVariantProps,
  formFieldFocusWithinClass,
  formFieldInvalidClass,
  formFieldSurfaceClass,
} from "@/shared/ui/form-field-styles";

const TAG_SEPARATORS = /[\s,;]+/;

export type TagsInputProps = {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  surface?: FormFieldVariantProps["surface"];
  normalizeTag?: (raw: string) => string | null;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function TagsInput({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  surface = "elevated",
  normalizeTag,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: TagsInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function commitRaw(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      return;
    }
    const normalized = normalizeTag ? normalizeTag(trimmed) : trimmed;
    if (!normalized || value.includes(normalized)) {
      return;
    }
    onChange([...value, normalized]);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    if (event.key === "Enter" || event.key === "," || event.key === ";") {
      event.preventDefault();
      commitRaw(input.value);
      input.value = "";
      return;
    }
    if (event.key === "Backspace" && input.value === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function onInputBlur(event: FocusEvent<HTMLInputElement>) {
    commitRaw(event.currentTarget.value);
    event.currentTarget.value = "";
  }

  function onInputPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!TAG_SEPARATORS.test(text)) {
      return;
    }
    event.preventDefault();
    for (const part of text.split(TAG_SEPARATORS)) {
      commitRaw(part);
    }
    event.currentTarget.value = "";
  }

  function removeTag(tag: string) {
    onChange(value.filter((entry) => entry !== tag));
    inputRef.current?.focus();
  }

  return (
    <fieldset
      disabled={disabled}
      aria-invalid={ariaInvalid}
      className={cn(
        "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1.5 text-sm transition-colors",
        formFieldSurfaceClass[surface ?? "elevated"],
        formFieldFocusWithinClass,
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
        formFieldInvalidClass,
        className
      )}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="h-7 gap-1 rounded-md px-2 py-0 font-normal">
          <span className="max-w-[14rem] truncate">{tag}</span>
          <button
            type="button"
            className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/25"
            aria-label={`Remove ${tag}`}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              removeTag(tag);
            }}
          >
            <IconX className="size-3.5" />
          </button>
        </Badge>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="email"
        autoComplete="off"
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
        onKeyDown={onInputKeyDown}
        onBlur={onInputBlur}
        onPaste={onInputPaste}
      />
    </fieldset>
  );
}
