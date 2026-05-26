"use client";

import { IconAlertTriangle, IconTrash } from "@tabler/icons-react";
import type * as React from "react";
import { cn } from "@/shared/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

function confirmTextMatches(input: string, expected: string): boolean {
  return input.trim().toLowerCase() === expected.trim().toLowerCase();
}

function ConfirmPromptValue({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1 font-mono text-xs">{children}</code>;
}

type TypedConfirmAlertDialogProps = {
  triggerLabel: string;
  triggerDisabled?: boolean;
  title: string;
  confirmFieldLabel: string;
  confirmFieldId: string;
  expectedValue: string;
  confirmValue: string;
  onConfirmValueChange: (value: string) => void;
  actionLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
};

function TypedConfirmAlertDialog({
  triggerLabel,
  triggerDisabled = false,
  title,
  confirmFieldLabel,
  confirmFieldId,
  expectedValue,
  confirmValue,
  onConfirmValueChange,
  actionLabel = "Delete permanently",
  busyLabel = "Deleting…",
  busy = false,
  onConfirm,
}: TypedConfirmAlertDialogProps) {
  const matches = confirmTextMatches(confirmValue, expectedValue);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" size="sm" disabled={triggerDisabled}>
          <IconTrash data-icon="inline-start" />
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="inline-flex items-center gap-1.5">
            <IconAlertTriangle className="size-4 text-destructive" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. Type the {confirmFieldLabel.toLowerCase()}{" "}
            <ConfirmPromptValue>{expectedValue}</ConfirmPromptValue> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor={confirmFieldId}>{confirmFieldLabel}</Label>
          <Input
            id={confirmFieldId}
            value={confirmValue}
            onChange={(event) => onConfirmValueChange(event.target.value)}
            placeholder={expectedValue}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
          <AlertDialogAction type="button" variant="destructive" disabled={busy || !matches} onClick={onConfirm}>
            {busy ? busyLabel : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const dangerZonePanelClass = "space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3";
const dangerZoneHeadingClass = "text-xs font-medium uppercase tracking-[0.12em] text-destructive";
const dangerZoneDescriptionClass = "text-xs text-destructive";

type DangerZoneTypedDeleteProps = TypedConfirmAlertDialogProps & {
  panelDescription: React.ReactNode;
  className?: string;
};

function DangerZoneTypedDelete({ panelDescription, className, ...dialogProps }: DangerZoneTypedDeleteProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <h3 className={dangerZoneHeadingClass}>Danger zone</h3>
      <div className={dangerZonePanelClass}>
        <p className={dangerZoneDescriptionClass}>{panelDescription}</p>
        <TypedConfirmAlertDialog {...dialogProps} />
      </div>
    </section>
  );
}

export { ConfirmPromptValue, confirmTextMatches, DangerZoneTypedDelete, TypedConfirmAlertDialog };
