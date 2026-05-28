"use client";

import type { MemberRow } from "@/features/team/model/workspace-types";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

export function RemoveMemberDialog(props: {
  removeTarget: MemberRow | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmRemove: (memberId: string) => void;
}) {
  const { removeTarget, busy, onOpenChange, onConfirmRemove } = props;

  return (
    <Dialog open={removeTarget != null} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Remove member?</DialogTitle>
          <DialogDescription>
            {removeTarget ? (
              <>
                Removes <span className="font-medium">{removeTarget.user.name || removeTarget.user.email}</span> from
                this workspace immediately. Send a new invite to add them back.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => {
              if (!removeTarget) {
                return;
              }
              onConfirmRemove(removeTarget.id);
            }}
          >
            Remove member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
