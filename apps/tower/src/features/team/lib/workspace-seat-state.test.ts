import { describe, expect, it } from "vitest";
import { getInviteSeatUiState, resolveWorkspaceSeatState } from "@/features/team/lib/workspace-seat-state";
import type { WorkspaceBillingView } from "@/server/billing/workspace-billing-view";

function billingView(overrides: Partial<WorkspaceBillingView> = {}): WorkspaceBillingView {
  return {
    billingEnabled: true,
    canManageBilling: true,
    isPaid: false,
    isAtSeatCap: false,
    isOverSeatCap: false,
    effectiveSeatLimit: 1,
    seatLimit: null,
    seatsUsed: 1,
    seatsRemaining: 0,
    teamCheckoutConfigured: true,
    hasStripeCustomer: false,
    billingPlan: null,
    subscriptionStatus: null,
    ...overrides,
  };
}

describe("resolveWorkspaceSeatState", () => {
  it("uses workspace billing when available", () => {
    expect(
      resolveWorkspaceSeatState({
        workspaceBilling: billingView({ isAtSeatCap: true, effectiveSeatLimit: 3 }),
        membersCount: 2,
        pendingInviteCount: 0,
      })
    ).toEqual({
      isAtSeatCap: true,
      isOverSeatCap: false,
      effectiveSeatLimit: 3,
      isPaid: false,
      billingEnabled: true,
      teamCheckoutConfigured: true,
    });
  });

  it("falls back to organization seat snapshot without billing", () => {
    expect(
      resolveWorkspaceSeatState({
        workspaceBilling: null,
        membersCount: 1,
        pendingInviteCount: 0,
        orgSeatLimit: null,
      })
    ).toEqual({
      isAtSeatCap: true,
      isOverSeatCap: false,
      effectiveSeatLimit: 1,
      isPaid: false,
      billingEnabled: false,
      teamCheckoutConfigured: false,
    });
  });
});

describe("getInviteSeatUiState", () => {
  const unpaidSeatState = resolveWorkspaceSeatState({
    workspaceBilling: billingView(),
    membersCount: 1,
    pendingInviteCount: 0,
  });

  it("shows upsell for empty unpaid workspaces with checkout configured", () => {
    expect(getInviteSeatUiState(unpaidSeatState, 0, "org-1")).toEqual({
      showInvitesUpsellState: true,
      inviteBlocked: false,
      showTeamUpgradeHint: false,
    });
  });

  it("blocks invites and shows upgrade hint at free seat cap", () => {
    const atCap = resolveWorkspaceSeatState({
      workspaceBilling: billingView({ isAtSeatCap: true }),
      membersCount: 1,
      pendingInviteCount: 0,
    });
    expect(getInviteSeatUiState(atCap, 1, "org-1")).toEqual({
      showInvitesUpsellState: false,
      inviteBlocked: true,
      showTeamUpgradeHint: true,
    });
  });

  it("does not show upsell when invitations already exist", () => {
    expect(getInviteSeatUiState(unpaidSeatState, 1, "org-1").showInvitesUpsellState).toBe(false);
  });

  it("does not show upsell without organization id", () => {
    expect(getInviteSeatUiState(unpaidSeatState, 0, null).showInvitesUpsellState).toBe(false);
  });

  it("blocks invites when over seat cap without upgrade hint", () => {
    const overCap = resolveWorkspaceSeatState({
      workspaceBilling: billingView({ isOverSeatCap: true, isAtSeatCap: true }),
      membersCount: 5,
      pendingInviteCount: 0,
    });
    expect(getInviteSeatUiState(overCap, 0, "org-1")).toEqual({
      showInvitesUpsellState: false,
      inviteBlocked: true,
      showTeamUpgradeHint: false,
    });
  });
});
