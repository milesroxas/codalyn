import { TOWER_TEAM_DEFAULT_SEAT_MAXIMUM, TOWER_TEAM_DEFAULT_SEAT_MINIMUM } from "@codalyn/webflow-kit";
import type { WorkspaceBillingView } from "@/server/billing/workspace-billing-view";
import { buildOrganizationSeatSnapshot } from "@/shared/lib/billing/organization-seat-cap";
import type { TeamSeatPrice } from "@/shared/lib/billing/team-seat-price";

export type WorkspaceSeatState = {
  isAtSeatCap: boolean;
  isOverSeatCap: boolean;
  effectiveSeatLimit: number;
  isPaid: boolean;
  billingEnabled: boolean;
  teamCheckoutConfigured: boolean;
  /** Minimum seats a Team checkout must purchase for this workspace. */
  checkoutSeatFloor: number;
  /** Upper bound on seats a single Team checkout may request. */
  checkoutSeatMax: number;
  /** Per-seat price for the checkout cost preview, or null when unavailable. */
  teamSeatPrice: TeamSeatPrice | null;
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
      checkoutSeatFloor: workspaceBilling.checkoutSeatFloor,
      checkoutSeatMax: workspaceBilling.checkoutSeatMax,
      teamSeatPrice: workspaceBilling.teamSeatPrice,
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
    checkoutSeatFloor: TOWER_TEAM_DEFAULT_SEAT_MINIMUM,
    checkoutSeatMax: TOWER_TEAM_DEFAULT_SEAT_MAXIMUM,
    teamSeatPrice: null,
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
