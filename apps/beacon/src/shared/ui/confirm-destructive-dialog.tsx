import type { ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

export type ConfirmDestructiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  cancelLabel: ReactNode;
  confirmLabel: ReactNode;
  /** While `true`, the dialog cannot be dismissed and both actions are disabled. */
  busy?: boolean;
  onConfirm: () => void;
};

/**
 * Shared confirm step for destructive actions — title + description + cancel + destructive confirm.
 * Single source of truth for the app's "are you sure?" dialog so every destructive flow looks and
 * behaves identically. Fully controlled; the caller owns `open` and the action wired to `onConfirm`.
 */
export function ConfirmDestructiveDialog(props: ConfirmDestructiveDialogProps) {
  const { open, onOpenChange, title, description, cancelLabel, confirmLabel, busy = false, onConfirm } = props;

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button" disabled={busy}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction type="button" variant="destructive" disabled={busy} onClick={() => onConfirm()}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
