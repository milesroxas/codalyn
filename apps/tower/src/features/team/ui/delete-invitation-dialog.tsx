"use client";

import type { InvitationRow } from "@/features/team/model/workspace-types";
import { TOWER_INVITATION_STATUS } from "@/shared/lib/membership/tower-invitation-status";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

function deleteInvitationDescription(inv: InvitationRow): string {
  if (inv.status === TOWER_INVITATION_STATUS.pending) {
    return "Removes this pending invite and frees the seat. They will no longer be able to accept the link.";
  }
  return "Removes this invitation from the list. It does not affect workspace members who already joined.";
}

export function DeleteInvitationDialog(props: {
  deleteTarget: InvitationRow | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: (invitationId: string) => void;
}) {
  const { deleteTarget, busy, onOpenChange, onConfirmDelete } = props;

  return (
    <Dialog open={deleteTarget != null} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Delete invitation?</DialogTitle>
          <DialogDescription>
            {deleteTarget ? (
              <>
                {deleteInvitationDescription(deleteTarget)} Email:{" "}
                <span className="font-medium">{deleteTarget.email}</span>
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
              if (!deleteTarget) {
                return;
              }
              onConfirmDelete(deleteTarget.id);
            }}
          >
            Delete invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
