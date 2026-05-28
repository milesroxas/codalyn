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

export function WorkspaceInviteEmailField(props: {
  id: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const { id, value, disabled, onChange } = props;

  return (
    <FormField>
      <Label htmlFor={id}>Email</Label>
      <Input
        id={id}
        type="email"
        autoComplete="email"
        placeholder="colleague@company.com"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        disabled={disabled}
      />
    </FormField>
  );
}

export function WorkspaceInviteRoleField(props: {
  id: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const { id, value, disabled, onChange } = props;

  return (
    <FormField>
      <Label htmlFor={id}>Role</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} aria-label="Role">
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
  );
}
