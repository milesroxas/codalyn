"use client";

import { IconClockHour4, IconMailForward, IconUserPlus } from "@tabler/icons-react";
import type { FormEvent } from "react";
import { formatInvitationExpiry } from "@/features/team/lib/workspace-invitation-utils";
import { getInviteSeatUiState, type WorkspaceSeatState } from "@/features/team/lib/workspace-seat-state";
import type { InvitationRow } from "@/features/team/model/workspace-types";
import { InvitationRowActions } from "@/features/team/ui/invitation-row-actions";
import { WorkspaceInvitesUpsellState } from "@/features/team/ui/workspace-invites-upsell";
import {
  formatTowerInvitationStatusLabel,
  TOWER_INVITATION_STATUS,
} from "@/shared/lib/membership/tower-invitation-status";
import { TOWER_TEAM_ROLES } from "@/shared/lib/membership/tower-organization-access";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField, FormFieldGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { NativeSelect } from "@/shared/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { TabsContent } from "@/shared/ui/tabs";

function InviteSeatLimitMessages(props: {
  seatState: WorkspaceSeatState;
  inviteBlocked: boolean;
  showTeamUpgradeHint: boolean;
}) {
  const { seatState, inviteBlocked, showTeamUpgradeHint } = props;

  if (seatState.isOverSeatCap) {
    return (
      <p className="text-sm text-destructive">
        Seat limit exceeded. Remove members or resubscribe on Billing before inviting.
      </p>
    );
  }
  if (showTeamUpgradeHint) {
    return (
      <p className="text-sm text-muted-foreground">Free includes one seat. Upgrade on Billing to invite others.</p>
    );
  }
  if (inviteBlocked) {
    return (
      <p className="text-sm text-muted-foreground">
        At seat limit ({seatState.effectiveSeatLimit}). Free a seat or upgrade on Billing to invite.
      </p>
    );
  }
  return null;
}

export function WorkspaceInvitesTab(props: {
  busy: boolean;
  inviteEmail: string;
  inviteRole: string;
  invitations: InvitationRow[];
  resendingInvitationId: string | null;
  seatState: WorkspaceSeatState;
  organizationId: string | null;
  canManageBilling: boolean;
  onInviteEmailChange: (v: string) => void;
  onInviteRoleChange: (v: string) => void;
  onInvite: (e: FormEvent) => void;
  onResendInvite: (inv: InvitationRow) => void;
  onRequestRevoke: (inv: InvitationRow) => void;
  onRequestDelete: (inv: InvitationRow) => void;
  onInviteAgain: (inv: InvitationRow) => void;
}) {
  const {
    busy,
    inviteEmail,
    inviteRole,
    invitations,
    resendingInvitationId,
    seatState,
    organizationId,
    canManageBilling,
    onInviteEmailChange,
    onInviteRoleChange,
    onInvite,
    onResendInvite,
    onRequestRevoke,
    onRequestDelete,
    onInviteAgain,
  } = props;

  const { showInvitesUpsellState, inviteBlocked, showTeamUpgradeHint } = getInviteSeatUiState(
    seatState,
    invitations.length,
    organizationId
  );

  if (showInvitesUpsellState && organizationId) {
    return <WorkspaceInvitesUpsellState organizationId={organizationId} canManageBilling={canManageBilling} />;
  }

  return (
    <TabsContent value="invites" className="space-y-6">
      <Card size="sm" className="border-primary/20 bg-linear-to-br from-primary/5 via-transparent to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconUserPlus className="size-4" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-base">Invite someone</CardTitle>
              <CardDescription>They receive an email to join this workspace.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <InviteSeatLimitMessages
            seatState={seatState}
            inviteBlocked={inviteBlocked}
            showTeamUpgradeHint={showTeamUpgradeHint}
          />
          <form
            className="flex flex-col gap-4 lg:flex-row lg:items-start"
            onSubmit={(ev) => {
              void onInvite(ev);
            }}
          >
            <FormFieldGrid className="min-w-0 flex-1">
              <FormField>
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
              </FormField>
              <FormField>
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
              </FormField>
            </FormFieldGrid>
            <div className="flex min-w-0 flex-col space-y-1.5 lg:shrink-0">
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

      <Card size="sm" layout="table-section">
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            Manage pending invites or clean up past invitations. Pending invites can be resent or revoked; ended invites
            can be deleted or re-sent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <IconMailForward className="size-10 text-muted-foreground/40" aria-hidden />
              <p className="text-sm font-medium text-foreground">No invitations yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Sent invites appear here with status and actions.
              </p>
            </div>
          ) : (
            <Table className="min-w-130">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-36">Expires</TableHead>
                  <TableHead className="w-52 text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  const isAccountDeleted = inv.status === TOWER_INVITATION_STATUS.accountDeleted;
                  const expiresLabel = formatInvitationExpiry(inv.expiresAt);
                  const resending = resendingInvitationId === inv.id;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {inv.role ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className={isAccountDeleted ? "text-destructive" : undefined}>
                        {formatTowerInvitationStatusLabel(inv.status)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {expiresLabel ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <IconClockHour4 className="size-3.5 opacity-60" aria-hidden />
                            {expiresLabel}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <InvitationRowActions
                          invitation={inv}
                          busy={busy}
                          resending={resending}
                          onResendInvite={onResendInvite}
                          onRequestRevoke={onRequestRevoke}
                          onRequestDelete={onRequestDelete}
                          onInviteAgain={onInviteAgain}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
