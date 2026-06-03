"use client";

import { IconAlertTriangle, IconTrash } from "@tabler/icons-react";
import type * as React from "react";
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
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField } from "@/shared/ui/form-field";
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
  description?: React.ReactNode;
  confirmFieldLabel: string;
  confirmFieldId: string;
  expectedValue: string;
  confirmValue: string;
  onConfirmValueChange: (value: string) => void;
  passwordFieldId?: string;
  passwordValue?: string;
  onPasswordValueChange?: (value: string) => void;
  actionLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onOpenChange?: (open: boolean) => void;
};

function TypedConfirmAlertDialog({
  triggerLabel,
  triggerDisabled = false,
  title,
  description,
  confirmFieldLabel,
  confirmFieldId,
  expectedValue,
  confirmValue,
  onConfirmValueChange,
  passwordFieldId,
  passwordValue = "",
  onPasswordValueChange,
  actionLabel = "Delete permanently",
  busyLabel = "Deleting…",
  busy = false,
  onConfirm,
  onOpenChange,
}: TypedConfirmAlertDialogProps) {
  const matches = confirmTextMatches(confirmValue, expectedValue);
  const passwordReady = !passwordFieldId || passwordValue.trim().length > 0;

  return (
    <AlertDialog onOpenChange={onOpenChange}>
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
            {description ?? (
              <>
                This cannot be undone. Type the {confirmFieldLabel.toLowerCase()}{" "}
                <ConfirmPromptValue>{expectedValue}</ConfirmPromptValue> to confirm.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {passwordFieldId && onPasswordValueChange ? (
          <FormField className="py-2">
            <Label htmlFor={passwordFieldId}>Password</Label>
            <Input
              id={passwordFieldId}
              type="password"
              autoComplete="current-password"
              value={passwordValue}
              onChange={(event) => onPasswordValueChange(event.target.value)}
            />
          </FormField>
        ) : null}
        <FormField className="py-2">
          <Label htmlFor={confirmFieldId}>{confirmFieldLabel}</Label>
          <Input
            id={confirmFieldId}
            value={confirmValue}
            onChange={(event) => onConfirmValueChange(event.target.value)}
            placeholder={expectedValue}
            autoComplete="off"
          />
        </FormField>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={busy || !matches || !passwordReady}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {busy ? busyLabel : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type DangerZoneTypedDeleteProps = TypedConfirmAlertDialogProps & {
  panelDescription: React.ReactNode;
  panelTitle?: string;
  className?: string;
};

function DangerZoneTypedDelete({
  panelDescription,
  panelTitle,
  className,
  triggerLabel,
  ...dialogProps
}: DangerZoneTypedDeleteProps) {
  const resolvedTitle = panelTitle ?? triggerLabel;

  return (
    <Card size="sm" tone="destructive" className={className}>
      <CardHeader>
        <CardTitle tone="destructive">{resolvedTitle}</CardTitle>
        <CardDescription tone="destructive">{panelDescription}</CardDescription>
        <CardAction align="center">
          <TypedConfirmAlertDialog triggerLabel={triggerLabel} {...dialogProps} />
        </CardAction>
      </CardHeader>
    </Card>
  );
}

export { ConfirmPromptValue, confirmTextMatches, DangerZoneTypedDelete, TypedConfirmAlertDialog };
