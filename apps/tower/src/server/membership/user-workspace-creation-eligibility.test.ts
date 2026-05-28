import { describe, expect, it } from "vitest";
import {
  FREE_TIER_OWNED_WORKSPACE_LIMIT,
  resolveUserWorkspaceCreationEligibilityFromRow,
  userMayCreateAnotherWorkspace,
} from "@/server/membership/user-workspace-creation-eligibility";

const baseRow = {
  id: "user-1",
  role: "user" as const,
  canCreateOrganization: false,
  subscriptionPlan: "free",
  subscriptionStatus: null,
  stripeSubscriptionId: null,
};

describe("userMayCreateAnotherWorkspace", () => {
  it("allows first owned workspace on free plan", () => {
    expect(
      userMayCreateAnotherWorkspace(0, {
        isProductAdmin: false,
        canCreateOrganizationOverride: false,
        hasIndividualPro: false,
      })
    ).toBe(true);
  });

  it("blocks second owned workspace on free plan", () => {
    expect(
      userMayCreateAnotherWorkspace(FREE_TIER_OWNED_WORKSPACE_LIMIT, {
        isProductAdmin: false,
        canCreateOrganizationOverride: false,
        hasIndividualPro: false,
      })
    ).toBe(false);
  });

  it("allows additional workspaces with individual Pro", () => {
    expect(
      userMayCreateAnotherWorkspace(2, {
        isProductAdmin: false,
        canCreateOrganizationOverride: false,
        hasIndividualPro: true,
      })
    ).toBe(true);
  });

  it("allows product admins regardless of count", () => {
    expect(
      userMayCreateAnotherWorkspace(5, {
        isProductAdmin: true,
        canCreateOrganizationOverride: false,
        hasIndividualPro: false,
      })
    ).toBe(true);
  });

  it("allows ops override for additional owned workspaces without Pro", () => {
    expect(
      userMayCreateAnotherWorkspace(FREE_TIER_OWNED_WORKSPACE_LIMIT, {
        isProductAdmin: false,
        canCreateOrganizationOverride: true,
        hasIndividualPro: false,
      })
    ).toBe(true);
  });

  it("does not use ops override to skip the first free workspace slot", () => {
    expect(
      userMayCreateAnotherWorkspace(0, {
        isProductAdmin: false,
        canCreateOrganizationOverride: true,
        hasIndividualPro: false,
      })
    ).toBe(true);
  });

  it("blocks second owned workspace when override is false and not Pro", () => {
    expect(
      userMayCreateAnotherWorkspace(FREE_TIER_OWNED_WORKSPACE_LIMIT, {
        isProductAdmin: false,
        canCreateOrganizationOverride: false,
        hasIndividualPro: false,
      })
    ).toBe(false);
  });
});

describe("resolveUserWorkspaceCreationEligibilityFromRow", () => {
  it("does not count toward limit when user only has non-admin memberships elsewhere", async () => {
    const result = await resolveUserWorkspaceCreationEligibilityFromRow(baseRow, 0);
    expect(result.canCreate).toBe(true);
    expect(result.ownedWorkspaceCount).toBe(0);
  });
});
