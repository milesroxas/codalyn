"use client";

import { IconClockHour4, IconMailForward } from "@tabler/icons-react";
import type { FormEvent } from "react";
import { formatInvitationExpiry } from "@/features/team/lib/workspace-invitation-utils";
import { getInviteSeatUiState, type WorkspaceSeatState } from "@/features/team/lib/workspace-seat-state";
import type { InvitationRow } from "@/features/team/model/workspace-types";
import { InvitationRowActions } from "@/features/team/ui/invitation-row-actions";
import { WorkspaceInviteAction } from "@/features/team/ui/workspace-invite-action";
import { WorkspaceInvitesUpsellState } from "@/features/team/ui/workspace-invites-upsell";
import {
  formatTowerInvitationStatusLabel,
  TOWER_INVITATION_STATUS,
} from "@/shared/lib/membership/tower-invitation-status";
import { Badge } from "@/shared/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { TabsContent } from "@/shared/ui/tabs";

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
  onInvite: (e: FormEvent) => boolean | undefined | Promise<boolean | undefined>;
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

  const { showInvitesUpsellState } = getInviteSeatUiState(seatState, invitations.length, organizationId);

  if (showInvitesUpsellState && organizationId) {
    return <WorkspaceInvitesUpsellState organizationId={organizationId} canManageBilling={canManageBilling} />;
  }

  return (
    <TabsContent value="invites" className="space-y-6">
      <Card size="sm" layout="table-section">
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            Manage pending invites or clean up past invitations. Pending invites can be resent or revoked; ended invites
            can be deleted or re-sent.
          </CardDescription>
          <CardAction align="center">
            <WorkspaceInviteAction
              busy={busy}
              inviteEmail={inviteEmail}
              inviteRole={inviteRole}
              seatState={seatState}
              organizationId={organizationId}
              invitationsCount={invitations.length}
              onInviteEmailChange={onInviteEmailChange}
              onInviteRoleChange={onInviteRoleChange}
              onInvite={onInvite}
            />
          </CardAction>
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
