"use client";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

export function LeaveWorkspaceDialog(props: {
  open: boolean;
  workspaceName: string;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmLeave: () => void;
}) {
  const { open, workspaceName, busy, onOpenChange, onConfirmLeave } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Leave workspace?</DialogTitle>
          <DialogDescription>
            You will lose access to <span className="font-medium">{workspaceName}</span>. An admin can invite you again
            later if needed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={onConfirmLeave}>
            Leave workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
