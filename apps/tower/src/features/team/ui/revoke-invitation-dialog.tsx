"use client";

import type { InvitationRow } from "@/features/team/model/workspace-types";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

export function RevokeInvitationDialog(props: {
  revokeTarget: InvitationRow | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmRevoke: (invitationId: string) => void;
}) {
  const { revokeTarget, busy, onOpenChange, onConfirmRevoke } = props;

  return (
    <Dialog open={revokeTarget != null} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Revoke invitation?</DialogTitle>
          <DialogDescription>
            {revokeTarget ? (
              <>
                Invalidates the invite for <span className="font-medium">{revokeTarget.email}</span>. Send a new one to
                add them.
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
              if (!revokeTarget) {
                return;
              }
              onConfirmRevoke(revokeTarget.id);
            }}
          >
            Revoke invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
