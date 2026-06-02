import { towerIndividualOwnedWorkspaceAllowance } from "@codalyn/webflow-kit";
import { describe, expect, it } from "vitest";
import {
  FREE_TIER_OWNED_WORKSPACE_LIMIT,
  resolveUserWorkspaceCreationEligibilityFromRow,
  userMayCreateAnotherWorkspace,
} from "@/server/membership/user-workspace-creation-eligibility";

const FREE_ALLOWANCE = towerIndividualOwnedWorkspaceAllowance("free");
const PRO_ALLOWANCE = towerIndividualOwnedWorkspaceAllowance("pro");
const STUDIO_ALLOWANCE = towerIndividualOwnedWorkspaceAllowance("studio");

const baseRow = {
  id: "user-1",
  role: "user" as const,
  canCreateOrganization: false,
  subscriptionPlan: "free",
  subscriptionStatus: null,
  stripeSubscriptionId: null,
};

describe("userMayCreateAnotherWorkspace", () => {
  it("allows the first owned workspace on the free allowance", () => {
    expect(
      userMayCreateAnotherWorkspace(0, {
        isProductAdmin: false,
        canCreateOrganizationOverride: false,
        ownedWorkspaceAllowance: FREE_ALLOWANCE,
      })
    ).toBe(true);
  });

  it("blocks a second owned workspace on the free allowance", () => {
    expect(
      userMayCreateAnotherWorkspace(FREE_ALLOWANCE, {
        isProductAdmin: false,
        canCreateOrganizationOverride: false,
        ownedWorkspaceAllowance: FREE_ALLOWANCE,
      })
    ).toBe(false);
  });

  it("allows Pro users up to their owned-workspace allowance", () => {
    expect(
      userMayCreateAnotherWorkspace(PRO_ALLOWANCE - 1, {
        isProductAdmin: false,
        canCreateOrganizationOverride: false,
        ownedWorkspaceAllowance: PRO_ALLOWANCE,
      })
    ).toBe(true);
  });

  it("blocks Pro users once they reach their owned-workspace allowance", () => {
    expect(
      userMayCreateAnotherWorkspace(PRO_ALLOWANCE, {
        isProductAdmin: false,
        canCreateOrganizationOverride: false,
        ownedWorkspaceAllowance: PRO_ALLOWANCE,
      })
    ).toBe(false);
  });

  it("allows Studio users their larger owned-workspace allowance", () => {
    expect(
      userMayCreateAnotherWorkspace(STUDIO_ALLOWANCE - 1, {
        isProductAdmin: false,
        canCreateOrganizationOverride: false,
        ownedWorkspaceAllowance: STUDIO_ALLOWANCE,
      })
    ).toBe(true);
    expect(
      userMayCreateAnotherWorkspace(STUDIO_ALLOWANCE, {
        isProductAdmin: false,
        canCreateOrganizationOverride: false,
        ownedWorkspaceAllowance: STUDIO_ALLOWANCE,
      })
    ).toBe(false);
  });

  it("does not let Team membership grant extra owned workspaces (allowance stays the free allowance)", () => {
    // A free user who only collaborates in a paid Team workspace still resolves the free allowance.
    expect(
      userMayCreateAnotherWorkspace(FREE_ALLOWANCE, {
        isProductAdmin: false,
        canCreateOrganizationOverride: false,
        ownedWorkspaceAllowance: FREE_ALLOWANCE,
      })
    ).toBe(false);
  });

  it("allows product admins regardless of count", () => {
    expect(
      userMayCreateAnotherWorkspace(STUDIO_ALLOWANCE + 5, {
        isProductAdmin: true,
        canCreateOrganizationOverride: false,
        ownedWorkspaceAllowance: FREE_ALLOWANCE,
      })
    ).toBe(true);
  });

  it("allows the operator override beyond the plan allowance", () => {
    expect(
      userMayCreateAnotherWorkspace(PRO_ALLOWANCE, {
        isProductAdmin: false,
        canCreateOrganizationOverride: true,
        ownedWorkspaceAllowance: PRO_ALLOWANCE,
      })
    ).toBe(true);
  });
});

describe("resolveUserWorkspaceCreationEligibilityFromRow", () => {
  it("resolves the free allowance for a user with only non-admin memberships elsewhere", async () => {
    const result = await resolveUserWorkspaceCreationEligibilityFromRow(baseRow, 0);
    expect(result.canCreate).toBe(true);
    expect(result.ownedWorkspaceCount).toBe(0);
    expect(result.individualPlan).toBe("free");
    expect(result.ownedWorkspaceAllowance).toBe(FREE_TIER_OWNED_WORKSPACE_LIMIT);
    expect(result.hasIndividualPro).toBe(false);
  });
});
