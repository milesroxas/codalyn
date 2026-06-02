import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isOrganizationTeamEntitled: vi.fn(),
  resolveUserIndividualPlan: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock("@/server/billing/organization-billing", () => ({
  isOrganizationTeamEntitled: mocks.isOrganizationTeamEntitled,
}));

vi.mock("@/server/billing/stripe-individual-pro", () => ({
  resolveUserIndividualPlan: mocks.resolveUserIndividualPlan,
}));

vi.mock("@/shared/lib/db", () => ({
  db: {
    select: mocks.dbSelect,
  },
}));

import { resolveTowerEntitlement } from "@/server/billing/entitlements";

function mockDbChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  mocks.dbSelect.mockReturnValue(chain);
  return chain;
}

describe("resolveTowerEntitlement", () => {
  it("uses Team limits for the active paid workspace", async () => {
    mocks.isOrganizationTeamEntitled.mockReturnValue(true);
    mockDbChain([
      {
        subscriptionStatus: "active",
        billingPlan: "team",
        stripeSubscriptionId: "sub_team",
      },
    ]);

    const result = await resolveTowerEntitlement("user-1", "org-paid");
    expect(result).toEqual({ tier: "team", source: "workspace_team" });
    expect(mocks.resolveUserIndividualPlan).not.toHaveBeenCalled();
  });

  it("uses Free limits on the user's own workspace when active org is unpaid", async () => {
    mocks.isOrganizationTeamEntitled.mockReturnValue(false);
    mocks.resolveUserIndividualPlan.mockResolvedValue(null);
    mockDbChain([{ subscriptionPlan: "free", subscriptionStatus: null, stripeSubscriptionId: null }]);

    const result = await resolveTowerEntitlement("user-1", "org-free");
    expect(result).toEqual({ tier: "free", source: "none" });
  });

  it("does not apply Team limits from non-active memberships", async () => {
    mocks.isOrganizationTeamEntitled.mockReturnValue(false);
    mocks.resolveUserIndividualPlan.mockResolvedValue(null);
    mockDbChain([{ subscriptionPlan: "free", subscriptionStatus: null, stripeSubscriptionId: null }]);

    const result = await resolveTowerEntitlement("user-1", "org-free");
    expect(result).toEqual({ tier: "free", source: "none" });
  });

  it("uses Pro limits from individual subscription when active workspace is unpaid", async () => {
    mocks.isOrganizationTeamEntitled.mockReturnValue(false);
    mocks.resolveUserIndividualPlan.mockResolvedValue("pro");
    mockDbChain([{ subscriptionPlan: "pro", subscriptionStatus: "active", stripeSubscriptionId: "sub_pro" }]);

    const result = await resolveTowerEntitlement("user-1", "org-free");
    expect(result).toEqual({ tier: "pro", source: "user_stripe" });
  });

  it("uses Studio limits from an individual Studio subscription", async () => {
    mocks.isOrganizationTeamEntitled.mockReturnValue(false);
    mocks.resolveUserIndividualPlan.mockResolvedValue("studio");
    mockDbChain([{ subscriptionPlan: "studio", subscriptionStatus: "active", stripeSubscriptionId: "sub_studio" }]);

    const result = await resolveTowerEntitlement("user-1", "org-free");
    expect(result).toEqual({ tier: "studio", source: "user_stripe" });
  });
});
