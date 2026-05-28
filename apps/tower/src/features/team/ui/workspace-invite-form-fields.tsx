"use client";

import type { WorkspaceSeatState } from "@/features/team/lib/workspace-seat-state";
import { TOWER_TEAM_ROLES } from "@/shared/lib/membership/tower-organization-access";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export function InviteSeatLimitMessages(props: {
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

export function WorkspaceInviteFields(props: {
  emailFieldId: string;
  roleFieldId: string;
  inviteEmail: string;
  inviteRole: string;
  inviteBlocked: boolean;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: string) => void;
}) {
  const { emailFieldId, roleFieldId, inviteEmail, inviteRole, inviteBlocked, onInviteEmailChange, onInviteRoleChange } =
    props;

  return (
    <>
      <FormField>
        <Label htmlFor={emailFieldId}>Email</Label>
        <Input
          id={emailFieldId}
          type="email"
          autoComplete="email"
          placeholder="colleague@company.com"
          value={inviteEmail}
          onChange={(event) => onInviteEmailChange(event.target.value)}
          required
          disabled={inviteBlocked}
        />
      </FormField>
      <FormField>
        <Label htmlFor={roleFieldId}>Role</Label>
        <Select value={inviteRole} onValueChange={onInviteRoleChange} disabled={inviteBlocked}>
          <SelectTrigger id={roleFieldId} aria-label="Role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOWER_TEAM_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </>
  );
}
