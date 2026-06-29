"use client";

import type { FormEvent } from "react";
import { countPendingInvitations } from "@/features/team/lib/team-org-boundary";
import type { InvitationRow, MemberDepartureRow, MemberRow } from "@/features/team/model/workspace-types";
import { TeamWorkspacePanelSkeleton } from "@/features/team/ui/team-workspace-panel-skeleton";
import { WorkspaceTabsShell } from "@/features/team/ui/workspace-tabs-shell";
import type { WorkspaceBillingView } from "@/server/billing/workspace-billing-view";

export function TeamWorkspacePanel(props: {
  activeOrgPending: boolean;
  activeOrg: { id: string; name: string; slug: string; ownerUserId?: string | null } | null | undefined;
  canManageTeam: boolean;
  workspaceBilling: WorkspaceBillingView | null;
  billingOrganizationId: string | null;
  activeTeamNameEdit: string;
  activeTeamSlugEdit: string;
  onActiveTeamNameEditChange: (v: string) => void;
  onActiveTeamSlugEditChange: (v: string) => void;
  onUpdateActiveTeamName: (e: FormEvent) => void;
  onUpdateActiveTeamSlug: () => void | Promise<void>;
  members: MemberRow[];
  memberRoleOptions: string[];
  invitations: InvitationRow[];
  inviteEmail: string;
  inviteRole: string;
  busy: boolean;
  currentUserId: string;
  onInviteEmailChange: (v: string) => void;
  onInviteRoleChange: (v: string) => void;
  onInvite: (e: FormEvent) => boolean | undefined | Promise<boolean | undefined>;
  onUpdateMemberRole: (memberId: string, role: string) => void;
  onRemoveMember: (memberId: string) => void;
  onLeaveWorkspace: () => void | Promise<void>;
  departures: MemberDepartureRow[];
  departuresPending: boolean;
  onResendInvite: (inv: InvitationRow) => void;
  onCancelInvite: (invitationId: string) => void | Promise<void>;
  onDeleteInvite: (invitationId: string) => void | Promise<void>;
  onInviteAgain: (inv: InvitationRow) => void;
  resendingInvitationId: string | null;
  deleteBusy: boolean;
  deleteConfirm: string;
  deletePassword: string;
  onDeleteConfirmChange: (value: string) => void;
  onDeletePasswordChange: (value: string) => void;
  onDeleteWorkspace: () => void | Promise<void>;
}) {
  const { activeOrgPending, activeOrg, invitations } = props;
  const pendingInviteCount = countPendingInvitations(invitations);

  return (
    <div className="space-y-8">
      {activeOrgPending ? <TeamWorkspacePanelSkeleton /> : null}

      {!activeOrgPending && !activeOrg ? (
        <div className="rounded-sm border border-dashed bg-muted/20 p-10 text-center">
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
          workspaceBilling={props.workspaceBilling}
          billingOrganizationId={props.billingOrganizationId}
          busy={props.busy}
          currentUserId={props.currentUserId}
          inviteEmail={props.inviteEmail}
          inviteRole={props.inviteRole}
          activeTeamNameEdit={props.activeTeamNameEdit}
          activeTeamSlugEdit={props.activeTeamSlugEdit}
          resendingInvitationId={props.resendingInvitationId}
          onInviteEmailChange={props.onInviteEmailChange}
          onInviteRoleChange={props.onInviteRoleChange}
          onInvite={props.onInvite}
          onUpdateActiveTeamName={props.onUpdateActiveTeamName}
          onUpdateActiveTeamSlug={props.onUpdateActiveTeamSlug}
          onActiveTeamNameEditChange={props.onActiveTeamNameEditChange}
          onActiveTeamSlugEditChange={props.onActiveTeamSlugEditChange}
          onUpdateMemberRole={props.onUpdateMemberRole}
          onRemoveMember={props.onRemoveMember}
          onLeaveWorkspace={props.onLeaveWorkspace}
          departures={props.departures}
          departuresPending={props.departuresPending}
          onResendInvite={props.onResendInvite}
          onCancelInvite={props.onCancelInvite}
          onDeleteInvite={props.onDeleteInvite}
          onInviteAgain={props.onInviteAgain}
          deleteBusy={props.deleteBusy}
          deleteConfirm={props.deleteConfirm}
          deletePassword={props.deletePassword}
          onDeleteConfirmChange={props.onDeleteConfirmChange}
          onDeletePasswordChange={props.onDeletePasswordChange}
          onDeleteWorkspace={props.onDeleteWorkspace}
        />
      ) : null}
    </div>
  );
}
