"use client";

import { IconUserPlus } from "@tabler/icons-react";
import type { FormEvent, ReactNode } from "react";
import type { WorkspaceSeatState } from "@/features/team/lib/workspace-seat-state";
import { WorkspaceInviteDialog } from "@/features/team/ui/workspace-invite-dialog";
import { Button } from "@/shared/ui/button";

export function WorkspaceInviteAction(props: {
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
  const { busy, trigger, ...dialogProps } = props;

  return (
    <WorkspaceInviteDialog
      busy={busy}
      {...dialogProps}
      trigger={
        trigger ?? (
          <Button type="button" size="sm" disabled={busy}>
            <IconUserPlus aria-hidden />
            Invite
          </Button>
        )
      }
    />
  );
}
