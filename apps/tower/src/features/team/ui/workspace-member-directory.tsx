"use client";

import type { MemberRow } from "@/features/team/model/workspace-types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
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

export function WorkspaceMemberDirectoryCard(props: {
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
    <Card size="sm" layout="table-section">
      <CardHeader>
        <CardTitle>Directory</CardTitle>
        <CardDescription>Workspace members and their access levels.</CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <Table className="min-w-130">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                {canManageTeam ? <TableHead className="w-36 text-end">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <MemberInitial name={m.user.name} email={m.user.email} />
                      <div className="min-w-0">
                        <div className="font-medium">{m.user.name || "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">{m.user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canManageTeam ? (
                      <NativeSelect
                        fieldSize="sm"
                        fieldWidth="role"
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
                  </TableCell>
                  {canManageTeam ? (
                    <TableCell className="text-end">
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
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
