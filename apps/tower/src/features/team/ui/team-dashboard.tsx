"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/features/auth/model/auth-client";
import { useRequireTowerSession } from "@/features/auth/model/use-require-tower-session";
import {
  deleteTeamInvitation,
  formatTeamInvitationDeleteError,
  TeamInvitationApiError,
} from "@/features/team/api/delete-invitation";
import {
  deleteTeamWorkspace,
  formatTeamWorkspaceDeleteError,
  TeamWorkspaceApiError,
} from "@/features/team/api/delete-workspace";
import { normalizeInvitationRows, normalizeMemberRows } from "@/features/team/lib/team-org-boundary";
import type { InvitationRow } from "@/features/team/model/workspace-types";
import { TeamDashboardSkeleton } from "@/features/team/ui/team-dashboard-skeleton";
import { TeamWorkspacePanel } from "@/features/team/ui/team-workspace-panel";
import type { WorkspaceBillingView } from "@/server/billing/workspace-billing-view";
import {
  isTowerTeamAdminRole,
  parseOrganizationMemberRole,
  parseTowerTeamRole,
  TOWER_TEAM_ROLES,
} from "@/shared/lib/membership/tower-organization-access";
import { parseWorkspaceSlug } from "@/shared/lib/membership/workspace-slug";
import { workspaceSlugErrorMessage } from "@/shared/lib/membership/workspace-slug-messages";
import { Button } from "@/shared/ui/button";
import { TowerPageHeader, TowerPageMain } from "@/shared/ui/tower-page-shell";

export function TeamDashboard(props: {
  workspaceBilling?: WorkspaceBillingView | null;
  activeOrganizationId?: string | null;
}) {
  const { workspaceBilling = null, activeOrganizationId = null } = props;
  const { session, sessionPending } = useRequireTowerSession("/team");
  const { refetch: refetchOrgs } = authClient.useListOrganizations();
  const {
    data: activeOrg,
    isPending: activeOrgPending,
    refetch: refetchActiveOrg,
  } = authClient.useActiveOrganization();
  const { data: activeMember, refetch: refetchActiveMember } = authClient.useActiveMember();

  const [activeTeamNameEdit, setActiveTeamNameEdit] = useState("");
  const [activeTeamSlugEdit, setActiveTeamSlugEdit] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>(TOWER_TEAM_ROLES[1]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [resendingInvitationId, setResendingInvitationId] = useState<string | null>(null);
  const canManageTeam = isTowerTeamAdminRole(activeMember?.role);

  const refreshTeam = useCallback(async () => {
    await Promise.all([refetchOrgs(), refetchActiveOrg(), refetchActiveMember()]);
  }, [refetchOrgs, refetchActiveOrg, refetchActiveMember]);

  useEffect(() => {
    if (activeOrg) {
      setActiveTeamNameEdit(activeOrg.name);
      setActiveTeamSlugEdit(activeOrg.slug);
      setDeleteConfirm("");
      setDeletePassword("");
    }
  }, [activeOrg]);

  const onDeleteWorkspace = useCallback(async () => {
    if (!activeOrg) {
      return;
    }
    setError(null);
    setDeleteBusy(true);
    try {
      await deleteTeamWorkspace(activeOrg.id, deleteConfirm, deletePassword);
      toast.success("Workspace deleted");
      window.location.assign("/");
    } catch (err) {
      const msg = err instanceof TeamWorkspaceApiError ? formatTeamWorkspaceDeleteError(err) : "Delete failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleteBusy(false);
    }
  }, [activeOrg, deleteConfirm, deletePassword]);

  const onUpdateActiveTeamName = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeOrg) {
      return;
    }
    const name = activeTeamNameEdit.trim();
    if (!name || name === activeOrg.name) {
      return;
    }
    setError(null);
    setBusy(true);
    const res = await authClient.organization.update({
      organizationId: activeOrg.id,
      data: { name },
    });
    setBusy(false);
    if (res.error) {
      const msg = res.error.message ?? "Could not update team name";
      setError(msg);
      toast.error(msg);
      return;
    }
    await refreshTeam();
    toast.success("Team name updated");
  };

  const onUpdateActiveTeamSlug = async () => {
    if (!activeOrg) {
      return;
    }
    const parsed = parseWorkspaceSlug(activeTeamSlugEdit);
    if (!parsed.ok) {
      const msg = workspaceSlugErrorMessage(parsed.error);
      setError(msg);
      toast.error(msg);
      return;
    }
    if (parsed.slug === activeOrg.slug) {
      return;
    }
    setError(null);
    setBusy(true);
    const res = await authClient.organization.update({
      organizationId: activeOrg.id,
      data: { slug: parsed.slug },
    });
    setBusy(false);
    if (res.error) {
      const msg = workspaceSlugErrorMessage(res.error.message ?? "Could not update workspace slug");
      setError(msg);
      toast.error(msg);
      return;
    }
    await refreshTeam();
    toast.success("Workspace slug updated");
  };

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      return false;
    }
    const role = parseTowerTeamRole(inviteRole);
    if (!role) {
      toast.error("Invalid role");
      return false;
    }
    setBusy(true);
    const res = await authClient.organization.inviteMember({
      email,
      role,
    });
    setBusy(false);
    if (res.error) {
      const msg = res.error.message ?? "Could not send invite";
      setError(msg);
      toast.error(msg);
      return false;
    }
    setInviteEmail("");
    await refreshTeam();
    toast.success("Invitation sent");
    return true;
  };

  const onResendInvite = async (inv: InvitationRow) => {
    setError(null);
    const role = parseTowerTeamRole(inv.role ?? TOWER_TEAM_ROLES[1]);
    if (!role) {
      toast.error("Invalid role");
      return;
    }
    setResendingInvitationId(inv.id);
    const res = await authClient.organization.inviteMember({
      email: inv.email.toLowerCase(),
      role,
      resend: true,
    });
    setResendingInvitationId(null);
    if (res.error) {
      const msg = res.error.message ?? "Could not resend invite";
      setError(msg);
      toast.error(msg);
      return;
    }
    await refreshTeam();
    toast.success("Invitation resent");
  };

  const onCancelInvite = async (invitationId: string) => {
    setError(null);
    setBusy(true);
    const res = await authClient.organization.cancelInvitation({ invitationId });
    setBusy(false);
    if (res.error) {
      const msg = res.error.message ?? "Could not revoke invite";
      setError(msg);
      toast.error(msg);
      return;
    }
    await refreshTeam();
    toast.success("Invitation revoked");
  };

  const onDeleteInvite = async (invitationId: string) => {
    if (!activeOrg) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await deleteTeamInvitation({ invitationId, organizationId: activeOrg.id });
      await refreshTeam();
      toast.success("Invitation deleted");
    } catch (err) {
      const msg =
        err instanceof TeamInvitationApiError ? formatTeamInvitationDeleteError(err) : "Could not delete invitation";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const onInviteAgain = async (inv: InvitationRow) => {
    setError(null);
    const role = parseTowerTeamRole(inv.role ?? TOWER_TEAM_ROLES[1]);
    if (!role) {
      toast.error("Invalid role");
      return;
    }
    setBusy(true);
    const res = await authClient.organization.inviteMember({
      email: inv.email.toLowerCase(),
      role,
    });
    setBusy(false);
    if (res.error) {
      const msg = res.error.message ?? "Could not send invite";
      setError(msg);
      toast.error(msg);
      return;
    }
    await refreshTeam();
    toast.success("Invitation sent");
  };

  const onUpdateMemberRole = async (memberId: string, role: string) => {
    setError(null);
    const parsedRole = parseOrganizationMemberRole(role);
    if (!parsedRole) {
      toast.error("Invalid role");
      return;
    }
    setBusy(true);
    const res = await authClient.organization.updateMemberRole({
      memberId,
      role: parsedRole,
    });
    setBusy(false);
    if (res.error) {
      const msg = res.error.message ?? "Could not update role";
      setError(msg);
      toast.error(msg);
      return;
    }
    await refreshTeam();
    toast.success("Member role updated");
  };

  const onRemoveMember = async (memberId: string) => {
    setError(null);
    setBusy(true);
    const res = await authClient.organization.removeMember({ memberIdOrEmail: memberId });
    setBusy(false);
    if (res.error) {
      const msg = res.error.message ?? "Could not remove member";
      setError(msg);
      toast.error(msg);
      return;
    }
    await refreshTeam();
    toast.success("Member removed");
  };

  const members = useMemo(() => normalizeMemberRows(activeOrg?.members), [activeOrg?.members]);
  const memberRoleOptions = useMemo(() => {
    const fromMembers = members.map((m) => m.role);
    return [...new Set([...TOWER_TEAM_ROLES, ...fromMembers])];
  }, [members]);
  const invitations = useMemo(() => normalizeInvitationRows(activeOrg?.invitations), [activeOrg?.invitations]);

  const showDashboardSkeleton = useDeferredLoadingIndicator(sessionPending);
  if (showDashboardSkeleton) {
    return <TeamDashboardSkeleton />;
  }
  if (sessionPending || !session?.user) {
    return null;
  }

  return (
    <TowerPageMain>
      <TowerPageHeader
        title="Team"
        description="Manage members, invites, roles, and workspace access."
        actions={
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void refreshTeam()}>
            Sync
          </Button>
        }
      />

      {error ? (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <TeamWorkspacePanel
        activeOrgPending={activeOrgPending}
        activeOrg={activeOrg}
        canManageTeam={canManageTeam}
        workspaceBilling={workspaceBilling}
        billingOrganizationId={activeOrganizationId ?? activeOrg?.id ?? null}
        activeTeamNameEdit={activeTeamNameEdit}
        activeTeamSlugEdit={activeTeamSlugEdit}
        onActiveTeamNameEditChange={setActiveTeamNameEdit}
        onActiveTeamSlugEditChange={setActiveTeamSlugEdit}
        onUpdateActiveTeamName={onUpdateActiveTeamName}
        onUpdateActiveTeamSlug={onUpdateActiveTeamSlug}
        members={members}
        memberRoleOptions={memberRoleOptions}
        invitations={invitations}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        busy={busy}
        currentUserId={session.user.id}
        onInviteEmailChange={setInviteEmail}
        onInviteRoleChange={setInviteRole}
        onInvite={onInvite}
        onUpdateMemberRole={onUpdateMemberRole}
        onRemoveMember={onRemoveMember}
        onResendInvite={(inv) => void onResendInvite(inv)}
        onCancelInvite={onCancelInvite}
        onDeleteInvite={onDeleteInvite}
        onInviteAgain={(inv) => void onInviteAgain(inv)}
        resendingInvitationId={resendingInvitationId}
        deleteBusy={deleteBusy}
        deleteConfirm={deleteConfirm}
        deletePassword={deletePassword}
        onDeleteConfirmChange={setDeleteConfirm}
        onDeletePasswordChange={setDeletePassword}
        onDeleteWorkspace={onDeleteWorkspace}
      />
    </TowerPageMain>
  );
}
