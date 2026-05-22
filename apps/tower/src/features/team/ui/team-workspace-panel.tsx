"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { TeamWorkspacePanelSkeleton } from "@/features/team/ui/team-workspace-panel-skeleton";
import { WorkspaceTabsShell } from "@/features/team/ui/workspace-subviews";
import type { InvitationRow, MemberRow } from "@/features/team/ui/workspace-types";

export function TeamWorkspacePanel(props: {
  activeOrgPending: boolean;
  activeOrg: { id: string; name: string; slug: string } | null | undefined;
  canManageTeam: boolean;
  activeTeamNameEdit: string;
  onActiveTeamNameEditChange: (v: string) => void;
  onUpdateActiveTeamName: (e: FormEvent) => void;
  members: MemberRow[];
  memberRoleOptions: string[];
  invitations: InvitationRow[];
  inviteEmail: string;
  inviteRole: string;
  busy: boolean;
  currentUserId: string;
  onInviteEmailChange: (v: string) => void;
  onInviteRoleChange: (v: string) => void;
  onInvite: (e: FormEvent) => void;
  onUpdateMemberRole: (memberId: string, role: string) => void;
  onRemoveMember: (memberId: string) => void;
  onResendInvite: (inv: InvitationRow) => void;
  onCancelInvite: (invitationId: string) => void | Promise<void>;
  resendingInvitationId: string | null;
}) {
  const { activeOrgPending, activeOrg, invitations } = props;
  const pendingInviteCount = invitations.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-8">
      {activeOrgPending ? <TeamWorkspacePanelSkeleton /> : null}

      {!activeOrgPending && !activeOrg ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-10 text-center">
          <p className="text-sm font-medium text-foreground">No workspace selected</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a workspace from the menu above to manage people and invitations.
          </p>
        </div>
      ) : null}

      {activeOrg ? (
        <WorkspaceTabsShell
          activeOrg={activeOrg}
          members={props.members}
          pendingInviteCount={pendingInviteCount}
          memberRoleOptions={props.memberRoleOptions}
          invitations={invitations}
          canManageTeam={props.canManageTeam}
          busy={props.busy}
          currentUserId={props.currentUserId}
          inviteEmail={props.inviteEmail}
          inviteRole={props.inviteRole}
          activeTeamNameEdit={props.activeTeamNameEdit}
          resendingInvitationId={props.resendingInvitationId}
          onInviteEmailChange={props.onInviteEmailChange}
          onInviteRoleChange={props.onInviteRoleChange}
          onInvite={props.onInvite}
          onUpdateActiveTeamName={props.onUpdateActiveTeamName}
          onActiveTeamNameEditChange={props.onActiveTeamNameEditChange}
          onUpdateMemberRole={props.onUpdateMemberRole}
          onRemoveMember={props.onRemoveMember}
          onResendInvite={props.onResendInvite}
          onCancelInvite={props.onCancelInvite}
        />
      ) : null}

      <p className="text-sm text-muted-foreground">
        <Link href="/" className="text-foreground underline underline-offset-4 hover:text-foreground/80">
          ← Home
        </Link>
      </p>
    </div>
  );
}
