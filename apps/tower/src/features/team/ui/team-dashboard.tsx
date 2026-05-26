"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/features/auth/model/auth-client";
import { useRequireTowerSession } from "@/features/auth/model/use-require-tower-session";
import {
  deleteTeamWorkspace,
  formatTeamWorkspaceDeleteError,
  TeamWorkspaceApiError,
} from "@/features/team/api/delete-workspace";
import { TeamDashboardSkeleton } from "@/features/team/ui/team-dashboard-skeleton";
import { TeamWorkspacePanel } from "@/features/team/ui/team-workspace-panel";
import type { InvitationRow, MemberRow } from "@/features/team/ui/workspace-types";
import type { WorkspaceBillingView } from "@/server/billing/workspace-billing-view";
import {
  isTowerTeamAdminRole,
  TOWER_TEAM_ROLES,
  type TowerTeamRole,
} from "@/shared/lib/membership/tower-organization-access";
import { parseWorkspaceSlug } from "@/shared/lib/membership/workspace-slug";
import { workspaceSlugErrorMessage } from "@/shared/lib/membership/workspace-slug-messages";
import { Button } from "@/shared/ui/button";
import { TowerPageHeader, TowerPageMain } from "@/shared/ui/tower-page-shell";

export function TeamDashboard(props: {
  billingEnabled?: boolean;
  workspaceBilling?: WorkspaceBillingView | null;
  activeOrganizationId?: string | null;
}) {
  const { billingEnabled = false, workspaceBilling = null, activeOrganizationId = null } = props;
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
    }
  }, [activeOrg]);

  const onDeleteWorkspace = useCallback(async () => {
    if (!activeOrg) {
      return;
    }
    setError(null);
    setDeleteBusy(true);
    try {
      await deleteTeamWorkspace(activeOrg.id, deleteConfirm);
      toast.success("Workspace deleted");
      window.location.assign("/");
    } catch (err) {
      const msg = err instanceof TeamWorkspaceApiError ? formatTeamWorkspaceDeleteError(err) : "Delete failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleteBusy(false);
    }
  }, [activeOrg, deleteConfirm]);

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
      return;
    }
    setBusy(true);
    const res = await authClient.organization.inviteMember({
      email,
      role: inviteRole as TowerTeamRole,
    });
    setBusy(false);
    if (res.error) {
      const msg = res.error.message ?? "Could not send invite";
      setError(msg);
      toast.error(msg);
      return;
    }
    setInviteEmail("");
    await refreshTeam();
    toast.success("Invitation sent");
  };

  const onResendInvite = async (inv: InvitationRow) => {
    setError(null);
    setResendingInvitationId(inv.id);
    const res = await authClient.organization.inviteMember({
      email: inv.email.toLowerCase(),
      role: (inv.role ?? TOWER_TEAM_ROLES[1]) as TowerTeamRole,
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

  const onUpdateMemberRole = async (memberId: string, role: string) => {
    setError(null);
    setBusy(true);
    const res = await authClient.organization.updateMemberRole({
      memberId,
      role: role as TowerTeamRole | "owner" | "member",
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

  const members = useMemo(() => (activeOrg?.members ?? []) as MemberRow[], [activeOrg?.members]);
  const memberRoleOptions = useMemo(() => {
    const fromMembers = members.map((m) => m.role);
    return [...new Set([...TOWER_TEAM_ROLES, ...fromMembers])];
  }, [members]);
  const invitations = useMemo(() => {
    const raw = activeOrg?.invitations ?? [];
    return raw.map((inv) => ({
      ...inv,
      expiresAt:
        inv && typeof inv === "object" && "expiresAt" in inv
          ? (inv as { expiresAt?: string | Date | null }).expiresAt
          : undefined,
    })) as InvitationRow[];
  }, [activeOrg?.invitations]);

  if (sessionPending || !session?.user) {
    return <TeamDashboardSkeleton />;
  }

  return (
    <TowerPageMain>
      <TowerPageHeader
        title="Team"
        description="Workspaces group people and permissions. Switch workspace anytime — invites and roles are scoped per workspace."
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
        billingEnabled={billingEnabled}
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
        resendingInvitationId={resendingInvitationId}
        deleteBusy={deleteBusy}
        deleteConfirm={deleteConfirm}
        onDeleteConfirmChange={setDeleteConfirm}
        onDeleteWorkspace={onDeleteWorkspace}
      />
    </TowerPageMain>
  );
}
