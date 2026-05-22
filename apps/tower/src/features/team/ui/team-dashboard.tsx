"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/features/auth/model/auth-client";
import { BeaconEditorExperienceSection } from "@/features/team/ui/beacon-editor-experience-section";
import { TeamDashboardSkeleton } from "@/features/team/ui/team-dashboard-skeleton";
import { TeamWorkspacePanel } from "@/features/team/ui/team-workspace-panel";
import type { InvitationRow, MemberRow } from "@/features/team/ui/workspace-types";
import {
  isTowerTeamAdminRole,
  TOWER_TEAM_ROLES,
  type TowerTeamRole,
} from "@/shared/lib/membership/tower-organization-access";
import { Button } from "@/shared/ui/button";

export function TeamDashboard() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { refetch: refetchOrgs } = authClient.useListOrganizations();
  const {
    data: activeOrg,
    isPending: activeOrgPending,
    refetch: refetchActiveOrg,
  } = authClient.useActiveOrganization();
  const { data: activeMember, refetch: refetchActiveMember } = authClient.useActiveMember();

  const [activeTeamNameEdit, setActiveTeamNameEdit] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>(TOWER_TEAM_ROLES[1]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendingInvitationId, setResendingInvitationId] = useState<string | null>(null);
  const canManageTeam = isTowerTeamAdminRole(activeMember?.role);

  const refreshTeam = useCallback(async () => {
    await Promise.all([refetchOrgs(), refetchActiveOrg(), refetchActiveMember()]);
  }, [refetchOrgs, refetchActiveOrg, refetchActiveMember]);

  useEffect(() => {
    if (activeOrg) {
      setActiveTeamNameEdit(activeOrg.name);
    }
  }, [activeOrg]);

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

  if (sessionPending) {
    return <TeamDashboardSkeleton />;
  }

  if (!session?.user) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-4 py-12 sm:px-6">
        <div className="max-w-md space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage workspaces, members, and invitations.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/sign-in?callbackUrl=/team">Sign in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sign-up?callbackUrl=/team">Create account</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-col gap-6 border-b border-border pb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
            <p className="text-sm text-muted-foreground">
              Workspaces group people and permissions. Switch workspace anytime — invites and roles are scoped per
              workspace.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void refreshTeam()}>
              Sync
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{session.user.email}</span>
          {session.user.role ? (
            <>
              <span className="hidden sm:inline" aria-hidden>
                ·
              </span>
              <span>
                App <span className="font-mono">{session.user.role}</span>
              </span>
            </>
          ) : null}
          {activeMember?.role ? (
            <>
              <span className="hidden sm:inline" aria-hidden>
                ·
              </span>
              <span>
                Workspace role <span className="font-mono">{activeMember.role}</span>
              </span>
            </>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <BeaconEditorExperienceSection enabled={canManageTeam && Boolean(activeOrg)} />

      <TeamWorkspacePanel
        activeOrgPending={activeOrgPending}
        activeOrg={activeOrg}
        canManageTeam={canManageTeam}
        activeTeamNameEdit={activeTeamNameEdit}
        onActiveTeamNameEditChange={setActiveTeamNameEdit}
        onUpdateActiveTeamName={onUpdateActiveTeamName}
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
      />
    </main>
  );
}
