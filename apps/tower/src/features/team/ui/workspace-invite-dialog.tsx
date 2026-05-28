"use client";

import { IconUserPlus } from "@tabler/icons-react";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { getInviteSeatUiState, type WorkspaceSeatState } from "@/features/team/lib/workspace-seat-state";
import {
  InviteSeatLimitMessages,
  WorkspaceInviteEmailField,
  WorkspaceInviteRoleField,
} from "@/features/team/ui/workspace-invite-form-fields";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { FormFieldGrid } from "@/shared/ui/form-field";

export function WorkspaceInviteDialog(props: {
  busy: boolean;
  inviteEmail: string;
  inviteRole: string;
  seatState: WorkspaceSeatState;
  organizationId: string | null;
  invitationsCount: number;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: string) => void;
  onInvite: (event: FormEvent) => boolean | undefined | Promise<boolean | undefined>;
  trigger?: ReactNode;
}) {
  const {
    busy,
    inviteEmail,
    inviteRole,
    seatState,
    organizationId,
    invitationsCount,
    onInviteEmailChange,
    onInviteRoleChange,
    onInvite,
    trigger,
  } = props;

  const [open, setOpen] = useState(false);
  const emailFieldId = useId();
  const roleFieldId = useId();

  const { showInvitesUpsellState, inviteBlocked, showTeamUpgradeHint } = getInviteSeatUiState(
    seatState,
    invitationsCount,
    organizationId
  );

  if (showInvitesUpsellState) {
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await onInvite(event);
    if (ok !== false) {
      setOpen(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" size="sm" disabled={busy}>
            <IconUserPlus aria-hidden />
            Invite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size="form">
        <DialogHeader>
          <DialogTitle>Invite someone</DialogTitle>
          <DialogDescription>They receive an email to join this workspace.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            void onSubmit(event);
          }}
          className="space-y-3"
        >
          <InviteSeatLimitMessages
            seatState={seatState}
            inviteBlocked={inviteBlocked}
            showTeamUpgradeHint={showTeamUpgradeHint}
          />
          <FormFieldGrid>
            <WorkspaceInviteEmailField
              id={emailFieldId}
              value={inviteEmail}
              disabled={inviteBlocked}
              onChange={onInviteEmailChange}
            />
            <WorkspaceInviteRoleField
              id={roleFieldId}
              value={inviteRole}
              disabled={inviteBlocked}
              onChange={onInviteRoleChange}
            />
          </FormFieldGrid>
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={busy || inviteBlocked}>
              {busy ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
