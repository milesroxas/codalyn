"use client";

import {
  IconClockHour4,
  IconCopy,
  IconCreditCard,
  IconMailForward,
  IconTrash,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { WorkspaceBillingSection } from "@/features/team/ui/workspace-billing-section";
import { formatInvitationExpiry } from "@/features/team/ui/workspace-invitation-utils";
import type { InvitationRow, MemberRow } from "@/features/team/ui/workspace-types";
import type { WorkspaceBillingView } from "@/server/billing/workspace-billing-view";
import { buildOrganizationSeatSnapshot } from "@/shared/lib/billing/organization-seat-cap";
import { TOWER_TEAM_ROLES } from "@/shared/lib/membership/tower-organization-access";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { NativeSelect } from "@/shared/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { DangerZoneTypedDelete } from "@/shared/ui/typed-confirm-alert-dialog";
import { WorkspaceSlugField } from "@/shared/ui/workspace-slug-field";

type WorkspaceSeatState = {
  isAtSeatCap: boolean;
  isOverSeatCap: boolean;
  effectiveSeatLimit: number;
  isPaid: boolean;
  billingEnabled: boolean;
  teamCheckoutConfigured: boolean;
};

function resolveWorkspaceSeatState(input: {
  workspaceBilling: WorkspaceBillingView | null;
  membersCount: number;
  pendingInviteCount: number;
  orgSeatLimit?: number | null;
}): WorkspaceSeatState {
  const { workspaceBilling, membersCount, pendingInviteCount, orgSeatLimit } = input;
  if (workspaceBilling) {
    return {
      isAtSeatCap: workspaceBilling.isAtSeatCap,
      isOverSeatCap: workspaceBilling.isOverSeatCap,
      effectiveSeatLimit: workspaceBilling.effectiveSeatLimit,
      isPaid: workspaceBilling.isPaid,
      billingEnabled: workspaceBilling.billingEnabled,
      teamCheckoutConfigured: workspaceBilling.teamCheckoutConfigured,
    };
  }
  const snapshot = buildOrganizationSeatSnapshot(membersCount + pendingInviteCount, {
    seatLimit: orgSeatLimit ?? null,
  });
  return {
    isAtSeatCap: snapshot.isAtSeatCap,
    isOverSeatCap: snapshot.isOverSeatCap,
    effectiveSeatLimit: snapshot.effectiveSeatLimit,
    isPaid: false,
    billingEnabled: false,
    teamCheckoutConfigured: false,
  };
}

function MemberInitial(props: { name: string; email: string }) {
  const letter = (props.name?.trim()[0] ?? props.email?.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
      aria-hidden
    >
      {letter}
    </span>
  );
}

function WorkspaceIdentityCard(props: {
  activeOrg: { id: string; name: string; slug: string };
  membersCount: number;
  pendingInviteCount: number;
  /** When false, omit pending-invite counts (non-admins cannot act on invitations). */
  showPendingInvitesSummary?: boolean;
}) {
  const { activeOrg, membersCount, pendingInviteCount, showPendingInvitesSummary = true } = props;
  const [slugCopied, setSlugCopied] = useState(false);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm ring-1 ring-border/60 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-xl font-semibold tracking-tight">{activeOrg.name}</h2>
          <Badge variant="secondary" className="font-mono text-xs">
            {activeOrg.slug}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {membersCount} member{membersCount === 1 ? "" : "s"}
          {showPendingInvitesSummary && pendingInviteCount > 0
            ? ` · ${pendingInviteCount} invite${pendingInviteCount === 1 ? "" : "s"} pending`
            : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-7 gap-1 text-muted-foreground"
            onClick={() => {
              void navigator.clipboard.writeText(activeOrg.slug);
              setSlugCopied(true);
              toast.success("Slug copied");
            }}
          >
            <IconCopy className="size-3.5" aria-hidden />
            {slugCopied ? "Copied" : "Copy slug"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function WorkspaceMemberDirectoryCard(props: {
  members: MemberRow[];
  memberRoleOptions: string[];
  canManageTeam: boolean;
  busy: boolean;
  currentUserId: string;
  onUpdateMemberRole: (memberId: string, role: string) => void;
  onRemoveMember: (memberId: string) => void;
}) {
  const { members, memberRoleOptions, canManageTeam, busy, currentUserId, onUpdateMemberRole, onRemoveMember } = props;

  return (
    <Card size="sm" className="overflow-hidden py-0">
      <CardHeader className="border-b bg-muted/30 py-4">
        <CardTitle className="text-base">Directory</CardTitle>
        <CardDescription>People in this workspace and their access level.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 py-0">
        {members.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32.5rem] text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  {canManageTeam ? <th className="w-36 px-4 py-3 text-end font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border/80 last:border-0 hover:bg-muted/10 [.border-b]:transition-colors"
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-start gap-3">
                        <MemberInitial name={m.user.name} email={m.user.email} />
                        <div className="min-w-0">
                          <div className="font-medium">{m.user.name || "—"}</div>
                          <div className="truncate text-xs text-muted-foreground">{m.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {canManageTeam ? (
                        <NativeSelect
                          fieldSize="sm"
                          className="min-w-28"
                          value={m.role}
                          disabled={busy || m.userId === currentUserId}
                          aria-label={`Role for ${m.user.email}`}
                          onChange={(ev) => {
                            void onUpdateMemberRole(m.id, ev.target.value);
                          }}
                        >
                          {memberRoleOptions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </NativeSelect>
                      ) : (
                        <Badge variant="secondary" className="font-mono text-xs">
                          {m.role}
                        </Badge>
                      )}
                    </td>
                    {canManageTeam ? (
                      <td className="px-4 py-3 text-end align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={busy || m.userId === currentUserId}
                          onClick={() => {
                            void onRemoveMember(m.id);
                          }}
                        >
                          Remove
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      {!canManageTeam ? (
        <CardFooter className="border-t text-xs text-muted-foreground">
          Only workspace admins can change roles or remove members.
        </CardFooter>
      ) : null}
    </Card>
  );
}

function WorkspaceInvitesTab(props: {
  busy: boolean;
  inviteEmail: string;
  inviteRole: string;
  invitations: InvitationRow[];
  resendingInvitationId: string | null;
  seatState: WorkspaceSeatState;
  onInviteEmailChange: (v: string) => void;
  onInviteRoleChange: (v: string) => void;
  onInvite: (e: FormEvent) => void;
  onResendInvite: (inv: InvitationRow) => void;
  onRequestRevoke: (inv: InvitationRow) => void;
}) {
  const {
    busy,
    inviteEmail,
    inviteRole,
    invitations,
    resendingInvitationId,
    seatState,
    onInviteEmailChange,
    onInviteRoleChange,
    onInvite,
    onResendInvite,
    onRequestRevoke,
  } = props;

  const inviteBlocked = seatState.isAtSeatCap || seatState.isOverSeatCap;
  const showTeamUpgradeHint =
    inviteBlocked &&
    !seatState.isPaid &&
    seatState.billingEnabled &&
    seatState.teamCheckoutConfigured &&
    !seatState.isOverSeatCap;

  return (
    <TabsContent value="invites" className="mt-6 space-y-6">
      <Card size="sm" className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconUserPlus className="size-4" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-base">Invite someone</CardTitle>
              <CardDescription>They will receive an email with a link to join this workspace.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {seatState.isOverSeatCap ? (
            <p className="text-sm text-destructive">
              This workspace exceeds its seat limit. Remove members or resubscribe to Team billing before inviting
              anyone new.
            </p>
          ) : null}
          {showTeamUpgradeHint ? (
            <p className="text-sm text-muted-foreground">
              Free workspaces include one member. Open the Billing tab and subscribe to Team (per seat) to invite
              collaborators.
            </p>
          ) : null}
          {inviteBlocked && !showTeamUpgradeHint && !seatState.isOverSeatCap ? (
            <p className="text-sm text-muted-foreground">
              This workspace is at its seat limit ({seatState.effectiveSeatLimit}). Remove a member, revoke a pending
              invite, or add seats via billing before sending new invites.
            </p>
          ) : null}
          <form
            className="flex flex-col gap-4 lg:flex-row lg:items-start"
            onSubmit={(ev) => {
              void onInvite(ev);
            }}
          >
            <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ws-invite-email">Email</Label>
                <Input
                  id="ws-invite-email"
                  type="email"
                  autoComplete="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(ev) => onInviteEmailChange(ev.target.value)}
                  required
                  disabled={inviteBlocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-invite-role">Role</Label>
                <NativeSelect
                  id="ws-invite-role"
                  value={inviteRole}
                  onChange={(ev) => onInviteRoleChange(ev.target.value)}
                  disabled={inviteBlocked}
                >
                  {TOWER_TEAM_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="flex min-w-0 flex-col space-y-2 lg:shrink-0">
              <span className="hidden text-sm font-medium leading-none select-none lg:block lg:invisible" aria-hidden>
                &nbsp;
              </span>
              <Button type="submit" disabled={busy || inviteBlocked} className="w-full shrink-0 lg:w-auto">
                Send invite
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card size="sm" className="overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/30 py-4">
          <CardTitle className="text-base">Invitations</CardTitle>
          <CardDescription>
            Track sent invitations. Pending rows can be resent or revoked before they are accepted.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {invitations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <IconMailForward className="size-10 text-muted-foreground/40" aria-hidden />
              <p className="text-sm font-medium text-foreground">No invitations yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                When you send an invite, it will appear here with status and actions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[35rem] text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="min-w-36 px-4 py-3 font-medium">Expires</th>
                    <th className="w-52 px-4 py-3 text-end font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => {
                    const isPending = inv.status === "pending";
                    const expiresLabel = formatInvitationExpiry(inv.expiresAt);
                    const resending = resendingInvitationId === inv.id;
                    return (
                      <tr key={inv.id} className="border-b border-border/80 last:border-0 hover:bg-muted/10">
                        <td className="px-4 py-3 align-middle font-medium">{inv.email}</td>
                        <td className="px-4 py-3 align-middle">
                          <Badge variant="outline" className="font-mono text-xs">
                            {inv.role ?? "—"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 align-middle capitalize">{inv.status}</td>
                        <td className="px-4 py-3 align-middle text-muted-foreground">
                          {expiresLabel ? (
                            <span className="inline-flex items-center gap-1 text-xs">
                              <IconClockHour4 className="size-3.5 opacity-60" aria-hidden />
                              {expiresLabel}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-end align-middle">
                          {isPending ? (
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busy || resending}
                                onClick={() => onResendInvite(inv)}
                              >
                                <IconMailForward className="size-3.5" aria-hidden />
                                Resend
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={busy}
                                onClick={() => onRequestRevoke(inv)}
                              >
                                <IconTrash className="size-3.5" aria-hidden />
                                Revoke
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

function WorkspaceSettingsTab(props: {
  activeOrg: { id: string; name: string; slug: string };
  busy: boolean;
  deleteBusy: boolean;
  deleteConfirm: string;
  memberCount: number;
  pendingInviteCount: number;
  activeTeamNameEdit: string;
  activeTeamSlugEdit: string;
  onActiveTeamNameEditChange: (v: string) => void;
  onActiveTeamSlugEditChange: (v: string) => void;
  onUpdateActiveTeamName: (e: FormEvent) => void;
  onUpdateActiveTeamSlug: () => void | Promise<void>;
  onDeleteConfirmChange: (value: string) => void;
  onDeleteWorkspace: () => void | Promise<void>;
}) {
  const {
    activeOrg,
    busy,
    deleteBusy,
    deleteConfirm,
    memberCount,
    pendingInviteCount,
    activeTeamNameEdit,
    activeTeamSlugEdit,
    onActiveTeamNameEditChange,
    onActiveTeamSlugEditChange,
    onUpdateActiveTeamName,
    onUpdateActiveTeamSlug,
    onDeleteConfirmChange,
    onDeleteWorkspace,
  } = props;

  const memberLabel = memberCount === 1 ? "member" : "members";
  const inviteLabel = pendingInviteCount === 1 ? "pending invitation" : "pending invitations";

  return (
    <TabsContent value="settings" className="mt-6 space-y-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Workspace profile</CardTitle>
          <CardDescription>This name is shown across Tower for everyone in the workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
            onSubmit={(ev) => {
              void onUpdateActiveTeamName(ev);
            }}
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="ws-name">Display name</Label>
              <Input
                id="ws-name"
                value={activeTeamNameEdit}
                onChange={(ev) => onActiveTeamNameEditChange(ev.target.value)}
                autoComplete="organization"
                placeholder="Workspace name"
              />
            </div>
            <Button
              type="submit"
              disabled={busy || !activeTeamNameEdit.trim() || activeTeamNameEdit.trim() === activeOrg.name}
            >
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Workspace slug</CardTitle>
          <CardDescription>
            A stable identifier used in support, integrations, and operator tools. Changing it does not affect member
            access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              void onUpdateActiveTeamSlug();
            }}
          >
            <WorkspaceSlugField
              id="ws-slug"
              value={activeTeamSlugEdit}
              currentSlug={activeOrg.slug}
              busy={busy}
              onChange={onActiveTeamSlugEditChange}
              onSave={() => {
                void onUpdateActiveTeamSlug();
              }}
            />
          </form>
        </CardContent>
      </Card>
      <DangerZoneTypedDelete
        panelDescription={
          <>
            Permanently delete this workspace. All {memberCount} {memberLabel} lose access immediately; their Tower
            accounts are not deleted.
            {pendingInviteCount > 0 ? ` ${pendingInviteCount} ${inviteLabel} will be revoked.` : null} Webflow
            connections, team presets, and billing for this workspace are removed. An active Team subscription is
            canceled.
          </>
        }
        triggerLabel="Delete workspace"
        title="Delete workspace?"
        confirmFieldLabel="Slug"
        confirmFieldId="team-delete-workspace-slug"
        expectedValue={activeOrg.slug}
        confirmValue={deleteConfirm}
        onConfirmValueChange={onDeleteConfirmChange}
        busy={deleteBusy}
        onConfirm={() => void onDeleteWorkspace()}
      />
    </TabsContent>
  );
}

function RevokeInvitationDialog(props: {
  revokeTarget: InvitationRow | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmRevoke: (invitationId: string) => void;
}) {
  const { revokeTarget, busy, onOpenChange, onConfirmRevoke } = props;

  return (
    <Dialog open={revokeTarget != null} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Revoke invitation?</DialogTitle>
          <DialogDescription>
            {revokeTarget ? (
              <>
                This will invalidate the invite for <span className="font-medium">{revokeTarget.email}</span>. They will
                need a new invitation to join.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => {
              if (!revokeTarget) {
                return;
              }
              onConfirmRevoke(revokeTarget.id);
            }}
          >
            Revoke invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WorkspaceTabsShell(props: {
  activeOrg: { id: string; name: string; slug: string; seatLimit?: number | null };
  members: MemberRow[];
  pendingInviteCount: number;
  memberRoleOptions: string[];
  invitations: InvitationRow[];
  canManageTeam: boolean;
  billingEnabled: boolean;
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
      <WorkspaceIdentityCard
        key={activeOrg.id}
        activeOrg={activeOrg}
        membersCount={members.length}
        pendingInviteCount={pendingInviteCount}
        showPendingInvitesSummary={canManageTeam}
      />

      {canManageTeam ? (
        <>
          <Tabs defaultValue="people" className="gap-0">
            <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="h-auto w-full gap-0.5 p-1 sm:max-w-md">
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
                  Settings
                </TabsTrigger>
                {workspaceBilling ? (
                  <TabsTrigger value="billing" className="gap-2 px-3 py-2 sm:flex-1">
                    <IconCreditCard className="size-4 opacity-70" aria-hidden />
                    Billing
                  </TabsTrigger>
                ) : null}
              </TabsList>
            </div>

            <TabsContent value="people" className="mt-6 space-y-4">
              {memberDirectory}
            </TabsContent>

            <WorkspaceInvitesTab
              busy={busy}
              inviteEmail={inviteEmail}
              inviteRole={inviteRole}
              invitations={invitations}
              resendingInvitationId={resendingInvitationId}
              seatState={seatState}
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
              <TabsContent value="billing" className="mt-6 space-y-6">
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
        <div className="mt-6">{memberDirectory}</div>
      )}
    </>
  );
}
