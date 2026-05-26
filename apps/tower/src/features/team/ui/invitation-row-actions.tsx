import { IconMailForward, IconTrash, IconUserPlus } from "@tabler/icons-react";
import type { InvitationRow } from "@/features/team/model/workspace-types";
import { resolveInvitationRowActions } from "@/shared/lib/membership/tower-invitation-actions";
import { Button } from "@/shared/ui/button";

export function InvitationRowActions(props: {
  invitation: InvitationRow;
  busy: boolean;
  resending: boolean;
  onResendInvite: (inv: InvitationRow) => void;
  onRequestRevoke: (inv: InvitationRow) => void;
  onRequestDelete: (inv: InvitationRow) => void;
  onInviteAgain: (inv: InvitationRow) => void;
}) {
  const { invitation, busy, resending, onResendInvite, onRequestRevoke, onRequestDelete, onInviteAgain } = props;
  const actions = resolveInvitationRowActions(invitation.status);

  if (!actions.resend && !actions.revoke && !actions.delete && !actions.inviteAgain) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {actions.inviteAgain ? (
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onInviteAgain(invitation)}>
          <IconUserPlus className="size-3.5" aria-hidden />
          Invite again
        </Button>
      ) : null}
      {actions.resend ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || resending}
          onClick={() => onResendInvite(invitation)}
        >
          <IconMailForward className="size-3.5" aria-hidden />
          Resend
        </Button>
      ) : null}
      {actions.revoke ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={busy}
          onClick={() => onRequestRevoke(invitation)}
        >
          <IconTrash className="size-3.5" aria-hidden />
          Revoke
        </Button>
      ) : null}
      {actions.delete ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={busy}
          onClick={() => onRequestDelete(invitation)}
        >
          <IconTrash className="size-3.5" aria-hidden />
          Delete
        </Button>
      ) : null}
    </div>
  );
}
