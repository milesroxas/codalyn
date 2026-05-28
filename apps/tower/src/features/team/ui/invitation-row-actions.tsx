"use client";

import { IconDotsVertical, IconMailForward, IconMailOff, IconTrash, IconUserPlus } from "@tabler/icons-react";
import type { InvitationRow } from "@/features/team/model/workspace-types";
import { resolveInvitationRowActions } from "@/shared/lib/membership/tower-invitation-actions";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

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

  const hasDestructiveActions = actions.revoke || actions.delete;

  return (
    <div className="flex items-center justify-end gap-1">
      {actions.inviteAgain ? (
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onInviteAgain(invitation)}>
          <IconUserPlus aria-hidden />
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
          <IconMailForward aria-hidden />
          Resend
        </Button>
      ) : null}
      {hasDestructiveActions ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label="More invitation actions">
              <IconDotsVertical aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.revoke ? (
              <DropdownMenuItem
                variant="destructive"
                disabled={busy}
                onSelect={() => {
                  onRequestRevoke(invitation);
                }}
              >
                <IconMailOff aria-hidden />
                Revoke
              </DropdownMenuItem>
            ) : null}
            {actions.delete ? (
              <DropdownMenuItem
                variant="destructive"
                disabled={busy}
                onSelect={() => {
                  onRequestDelete(invitation);
                }}
              >
                <IconTrash aria-hidden />
                Delete
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
