"use client";

import type { FormEvent } from "react";
import type { WorkspaceSeatState } from "@/features/team/lib/workspace-seat-state";
import type { MemberDepartureRow, MemberRow } from "@/features/team/model/workspace-types";
import { WorkspaceInviteAction } from "@/features/team/ui/workspace-invite-action";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { NativeSelect } from "@/shared/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

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

function formatDepartureTime(value: MemberDepartureRow["departedAt"]): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function WorkspaceMemberDirectoryRow(props: {
  member: MemberRow;
  currentUserId: string;
  canManageTeam: boolean;
  canLeaveWorkspace: boolean;
  showActionsColumn: boolean;
  busy: boolean;
  memberRoleOptions: string[];
  onUpdateMemberRole: (memberId: string, role: string) => void;
  onRequestRemoveMember: (member: MemberRow) => void;
  onRequestLeaveWorkspace: () => void;
}) {
  const {
    member,
    currentUserId,
    canManageTeam,
    canLeaveWorkspace,
    showActionsColumn,
    busy,
    memberRoleOptions,
    onUpdateMemberRole,
    onRequestRemoveMember,
    onRequestLeaveWorkspace,
  } = props;

  const isSelf = member.userId === currentUserId;
  const showRemove = canManageTeam && !isSelf;
  const showLeave = isSelf && canLeaveWorkspace;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-start gap-3">
          <MemberInitial name={member.user.name} email={member.user.email} />
          <div className="min-w-0">
            <div className="font-medium">
              {member.user.name || "—"}
              {isSelf ? <span className="text-muted-foreground"> (you)</span> : null}
            </div>
            <div className="truncate text-xs text-muted-foreground">{member.user.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {canManageTeam ? (
          <NativeSelect
            fieldSize="sm"
            fieldWidth="role"
            value={member.role}
            disabled={busy || isSelf}
            aria-label={`Role for ${member.user.email}`}
            onChange={(ev) => {
              void onUpdateMemberRole(member.id, ev.target.value);
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
            {member.role}
          </Badge>
        )}
      </TableCell>
      {showActionsColumn ? (
        <TableCell className="text-end">
          {showRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={busy}
              onClick={() => onRequestRemoveMember(member)}
            >
              Remove
            </Button>
          ) : null}
          {showLeave ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={busy}
              onClick={onRequestLeaveWorkspace}
            >
              Leave
            </Button>
          ) : null}
        </TableCell>
      ) : null}
    </TableRow>
  );
}

function WorkspaceMemberDeparturesSection(props: { departures: MemberDepartureRow[]; departuresPending: boolean }) {
  const { departures, departuresPending } = props;

  if (departuresPending || departures.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 border-t px-4 pt-6">
      <div>
        <h3 className="text-sm font-medium">Recent departures</h3>
        <p className="text-xs text-muted-foreground">
          Members who left this workspace on their own. Only admins can see this list.
        </p>
      </div>
      <Table className="min-w-130">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Former member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Left</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departures.map((departure) => (
            <TableRow key={departure.id}>
              <TableCell>
                <div className="min-w-0">
                  <div className="font-medium">{departure.userName || "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">{departure.userEmail}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-xs">
                  {departure.role}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDepartureTime(departure.departedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

export function WorkspaceMemberDirectoryCard(props: {
  members: MemberRow[];
  memberRoleOptions: string[];
  canManageTeam: boolean;
  busy: boolean;
  currentUserId: string;
  ownerUserId: string | null | undefined;
  inviteEmail: string;
  inviteRole: string;
  seatState: WorkspaceSeatState;
  organizationId: string | null;
  invitationsCount: number;
  departures: MemberDepartureRow[];
  departuresPending: boolean;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: string) => void;
  onInvite: (event: FormEvent) => boolean | undefined | Promise<boolean | undefined>;
  onUpdateMemberRole: (memberId: string, role: string) => void;
  onRequestRemoveMember: (member: MemberRow) => void;
  onRequestLeaveWorkspace: () => void;
}) {
  const {
    members,
    memberRoleOptions,
    canManageTeam,
    busy,
    currentUserId,
    ownerUserId,
    inviteEmail,
    inviteRole,
    seatState,
    organizationId,
    invitationsCount,
    departures,
    departuresPending,
    onInviteEmailChange,
    onInviteRoleChange,
    onInvite,
    onUpdateMemberRole,
    onRequestRemoveMember,
    onRequestLeaveWorkspace,
  } = props;

  const canLeaveWorkspace = Boolean(ownerUserId && ownerUserId !== currentUserId);
  const showActionsColumn =
    canManageTeam || members.some((member) => member.userId === currentUserId && canLeaveWorkspace);

  return (
    <Card size="sm" layout="table-section">
      <CardHeader>
        <CardTitle>Directory</CardTitle>
        <CardDescription>Workspace members and their access levels.</CardDescription>
        {canManageTeam ? (
          <CardAction align="center">
            <WorkspaceInviteAction
              busy={busy}
              inviteEmail={inviteEmail}
              inviteRole={inviteRole}
              seatState={seatState}
              organizationId={organizationId}
              invitationsCount={invitationsCount}
              onInviteEmailChange={onInviteEmailChange}
              onInviteRoleChange={onInviteRoleChange}
              onInvite={onInvite}
            />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6 pb-4">
        {members.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <Table className="min-w-130">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                {showActionsColumn ? <TableHead className="w-36 text-end">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <WorkspaceMemberDirectoryRow
                  key={member.id}
                  member={member}
                  currentUserId={currentUserId}
                  canManageTeam={canManageTeam}
                  canLeaveWorkspace={canLeaveWorkspace}
                  showActionsColumn={showActionsColumn}
                  busy={busy}
                  memberRoleOptions={memberRoleOptions}
                  onUpdateMemberRole={onUpdateMemberRole}
                  onRequestRemoveMember={onRequestRemoveMember}
                  onRequestLeaveWorkspace={onRequestLeaveWorkspace}
                />
              ))}
            </TableBody>
          </Table>
        )}

        {canManageTeam ? (
          <WorkspaceMemberDeparturesSection departures={departures} departuresPending={departuresPending} />
        ) : null}
      </CardContent>
      {!canManageTeam ? (
        <CardFooter className="border-t text-xs text-muted-foreground">
          {canLeaveWorkspace
            ? "You can leave this workspace from the Actions column. Only workspace admins can change roles or remove members."
            : "Only workspace admins can change roles or remove members."}
        </CardFooter>
      ) : null}
    </Card>
  );
}
