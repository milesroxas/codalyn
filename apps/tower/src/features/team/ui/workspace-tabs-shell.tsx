"use client";

import { IconCreditCard, IconMailForward, IconSettings, IconUsers } from "@tabler/icons-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { resolveWorkspaceSeatState } from "@/features/team/lib/workspace-seat-state";
import type { InvitationRow, MemberRow, WorkspaceOrgSummary } from "@/features/team/model/workspace-types";
import { RevokeInvitationDialog } from "@/features/team/ui/revoke-invitation-dialog";
import { WorkspaceBillingSection } from "@/features/team/ui/workspace-billing-section";
import { WorkspaceIdentityCard } from "@/features/team/ui/workspace-identity-card";
import { WorkspaceInvitesTab } from "@/features/team/ui/workspace-invites-tab";
import { WorkspaceMemberDirectoryCard } from "@/features/team/ui/workspace-member-directory";
import { WorkspaceSettingsTab } from "@/features/team/ui/workspace-settings-tab";
import type { WorkspaceBillingView } from "@/server/billing/workspace-billing-view";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

export function WorkspaceTabsShell(props: {
  activeOrg: WorkspaceOrgSummary;
  members: MemberRow[];
  pendingInviteCount: number;
  memberRoleOptions: string[];
  invitations: InvitationRow[];
  canManageTeam: boolean;
  workspaceBilling: WorkspaceBillingView | null;
  billingOrganizationId: string | null;
  busy: boolean;
  currentUserId: string;
  inviteEmail: string;
  inviteRole: string;
  activeTeamNameEdit: string;
  activeTeamSlugEdit: string;
  resendingInvitationId: string | null;
  deleteBusy: boolean;
  deleteConfirm: string;
  onDeleteConfirmChange: (value: string) => void;
  onDeleteWorkspace: () => void | Promise<void>;
  onInviteEmailChange: (v: string) => void;
  onInviteRoleChange: (v: string) => void;
  onInvite: (e: FormEvent) => void;
  onUpdateActiveTeamName: (e: FormEvent) => void;
  onUpdateActiveTeamSlug: () => void | Promise<void>;
  onActiveTeamNameEditChange: (v: string) => void;
  onActiveTeamSlugEditChange: (v: string) => void;
  onUpdateMemberRole: (memberId: string, role: string) => void;
  onRemoveMember: (memberId: string) => void;
  onResendInvite: (inv: InvitationRow) => void;
  onCancelInvite: (invitationId: string) => void;
}) {
  const {
    activeOrg,
    members,
    pendingInviteCount,
    memberRoleOptions,
    invitations,
    canManageTeam,
    workspaceBilling,
    billingOrganizationId,
    busy,
    currentUserId,
    inviteEmail,
    inviteRole,
    activeTeamNameEdit,
    activeTeamSlugEdit,
    resendingInvitationId,
    deleteBusy,
    deleteConfirm,
    onDeleteConfirmChange,
    onDeleteWorkspace,
    onInviteEmailChange,
    onInviteRoleChange,
    onInvite,
    onUpdateActiveTeamName,
    onUpdateActiveTeamSlug,
    onActiveTeamNameEditChange,
    onActiveTeamSlugEditChange,
    onUpdateMemberRole,
    onRemoveMember,
    onResendInvite,
    onCancelInvite,
  } = props;

  const [revokeTarget, setRevokeTarget] = useState<InvitationRow | null>(null);

  const seatState = resolveWorkspaceSeatState({
    workspaceBilling,
    membersCount: members.length,
    pendingInviteCount,
    orgSeatLimit: activeOrg.seatLimit,
  });

  const memberDirectory = (
    <WorkspaceMemberDirectoryCard
      members={members}
      memberRoleOptions={memberRoleOptions}
      canManageTeam={canManageTeam}
      busy={busy}
      currentUserId={currentUserId}
      onUpdateMemberRole={onUpdateMemberRole}
      onRemoveMember={onRemoveMember}
    />
  );

  return (
    <>
      {canManageTeam ? (
        <>
          <Tabs defaultValue="people" className="gap-4">
            <TabsList className="h-auto w-full gap-0.5 p-1 sm:max-w-lg">
              <TabsTrigger value="people" className="gap-2 px-3 py-2 sm:flex-1">
                <IconUsers className="size-4 opacity-70" aria-hidden />
                People
                <Badge variant="outline" className="h-5 min-w-6 px-1.5 font-mono text-xs">
                  {members.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="invites" className="gap-2 px-3 py-2 sm:flex-1">
                <IconMailForward className="size-4 opacity-70" aria-hidden />
                Invitations
                <Badge variant="outline" className="h-5 min-w-6 px-1.5 font-mono text-xs">
                  {pendingInviteCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2 px-3 py-2 sm:flex-1">
                <IconSettings className="size-4 opacity-70" aria-hidden />
                Settings
              </TabsTrigger>
              {workspaceBilling ? (
                <TabsTrigger value="billing" className="gap-2 px-3 py-2 sm:flex-1">
                  <IconCreditCard className="size-4 opacity-70" aria-hidden />
                  Billing
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="people" className="space-y-4">
              {memberDirectory}
            </TabsContent>

            <WorkspaceInvitesTab
              busy={busy}
              inviteEmail={inviteEmail}
              inviteRole={inviteRole}
              invitations={invitations}
              resendingInvitationId={resendingInvitationId}
              seatState={seatState}
              organizationId={billingOrganizationId}
              canManageBilling={workspaceBilling?.canManageBilling ?? false}
              onInviteEmailChange={onInviteEmailChange}
              onInviteRoleChange={onInviteRoleChange}
              onInvite={onInvite}
              onResendInvite={onResendInvite}
              onRequestRevoke={(inv) => setRevokeTarget(inv)}
            />

            <WorkspaceSettingsTab
              activeOrg={activeOrg}
              busy={busy}
              deleteBusy={deleteBusy}
              deleteConfirm={deleteConfirm}
              memberCount={members.length}
              pendingInviteCount={pendingInviteCount}
              activeTeamNameEdit={activeTeamNameEdit}
              activeTeamSlugEdit={activeTeamSlugEdit}
              onActiveTeamNameEditChange={onActiveTeamNameEditChange}
              onActiveTeamSlugEditChange={onActiveTeamSlugEditChange}
              onUpdateActiveTeamName={onUpdateActiveTeamName}
              onUpdateActiveTeamSlug={onUpdateActiveTeamSlug}
              onDeleteConfirmChange={onDeleteConfirmChange}
              onDeleteWorkspace={onDeleteWorkspace}
            />

            {workspaceBilling && billingOrganizationId ? (
              <TabsContent value="billing" className="space-y-6">
                <WorkspaceBillingSection organizationId={billingOrganizationId} billing={workspaceBilling} />
              </TabsContent>
            ) : null}
          </Tabs>

          <RevokeInvitationDialog
            revokeTarget={revokeTarget}
            busy={busy}
            onOpenChange={(open) => {
              if (!open) {
                setRevokeTarget(null);
              }
            }}
            onConfirmRevoke={(invitationId) => {
              void onCancelInvite(invitationId);
              setRevokeTarget(null);
            }}
          />
        </>
      ) : (
        <div className="space-y-6">
          <WorkspaceIdentityCard
            key={activeOrg.id}
            activeOrg={activeOrg}
            membersCount={members.length}
            pendingInviteCount={pendingInviteCount}
            showPendingInvitesSummary={false}
          />
          {memberDirectory}
        </div>
      )}
    </>
  );
}
