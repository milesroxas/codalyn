import type { WorkspaceBillingView } from "@/server/billing/workspace-billing-view";
import { buildOrganizationSeatSnapshot } from "@/shared/lib/billing/organization-seat-cap";

export type WorkspaceSeatState = {
  isAtSeatCap: boolean;
  isOverSeatCap: boolean;
  effectiveSeatLimit: number;
  isPaid: boolean;
  billingEnabled: boolean;
  teamCheckoutConfigured: boolean;
};

export function resolveWorkspaceSeatState(input: {
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

export type InviteSeatUiState = {
  showInvitesUpsellState: boolean;
  inviteBlocked: boolean;
  showTeamUpgradeHint: boolean;
};

export function getInviteSeatUiState(
  seatState: WorkspaceSeatState,
  invitationsCount: number,
  organizationId: string | null
): InviteSeatUiState {
  const showInvitesUpsellState =
    !seatState.isPaid &&
    seatState.billingEnabled &&
    seatState.teamCheckoutConfigured &&
    !seatState.isOverSeatCap &&
    invitationsCount === 0 &&
    organizationId != null;

  const inviteBlocked = seatState.isAtSeatCap || seatState.isOverSeatCap;
  const showTeamUpgradeHint =
    inviteBlocked &&
    !seatState.isPaid &&
    seatState.billingEnabled &&
    seatState.teamCheckoutConfigured &&
    !seatState.isOverSeatCap;

  return { showInvitesUpsellState, inviteBlocked, showTeamUpgradeHint };
}
