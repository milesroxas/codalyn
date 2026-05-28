import { describe, expect, it } from "vitest";
import { TEAM_BILLING_PLAN } from "@/server/billing/team-billing-config";
import {
  buildOperatorOrgBillingSnapshot,
  buildOperatorUserBillingSnapshot,
  isOperatorBillingManagedByStripe,
  resolveOperatorStripeManagedPatchConflict,
} from "@/server/operator/operator-billing";

describe("isOperatorBillingManagedByStripe", () => {
  it("is true when a subscription id is present", () => {
    expect(isOperatorBillingManagedByStripe("sub_1")).toBe(true);
  });

  it("is false when subscription id is missing", () => {
    expect(isOperatorBillingManagedByStripe(null)).toBe(false);
  });
});

describe("buildOperatorOrgBillingSnapshot", () => {
  it("marks stripe team rows as managed and pro entitled", () => {
    expect(
      buildOperatorOrgBillingSnapshot({
        billingPlan: TEAM_BILLING_PLAN,
        subscriptionStatus: "active",
        stripeSubscriptionId: "sub_team_1",
      })
    ).toEqual({
      billingMode: "stripe_team",
      billingManagedByStripe: true,
      isProEntitled: true,
      displayBillingPlan: TEAM_BILLING_PLAN,
      planLabel: "Team",
      canOperatorEditBilling: false,
      canOperatorEditSeatLimit: true,
    });
  });

  it("allows legacy operator plans without stripe id", () => {
    expect(
      buildOperatorOrgBillingSnapshot({
        billingPlan: "pro team",
        subscriptionStatus: "active",
        stripeSubscriptionId: null,
      })
    ).toEqual({
      billingMode: "legacy_paid",
      billingManagedByStripe: false,
      isProEntitled: true,
      displayBillingPlan: "pro team",
      planLabel: "pro team",
      canOperatorEditBilling: true,
      canOperatorEditSeatLimit: true,
    });
  });

  it("marks unpaid workspaces as free", () => {
    expect(
      buildOperatorOrgBillingSnapshot({
        billingPlan: null,
        subscriptionStatus: null,
        stripeSubscriptionId: null,
      })
    ).toEqual({
      billingMode: "free",
      billingManagedByStripe: false,
      isProEntitled: false,
      displayBillingPlan: null,
      planLabel: "Free",
      canOperatorEditBilling: true,
      canOperatorEditSeatLimit: true,
    });
  });
});

describe("buildOperatorUserBillingSnapshot", () => {
  it("does not grant stripe pro when billing feature is off", () => {
    const prev = process.env.TOWER_BILLING_ENABLED;
    process.env.TOWER_BILLING_ENABLED = "0";
    try {
      expect(
        buildOperatorUserBillingSnapshot({
          subscriptionPlan: "pro",
          subscriptionStatus: "active",
          stripeSubscriptionId: "sub_1",
        })
      ).toEqual({
        billingManagedByStripe: true,
        hasStripePro: false,
      });
    } finally {
      if (prev === undefined) {
        delete process.env.TOWER_BILLING_ENABLED;
      } else {
        process.env.TOWER_BILLING_ENABLED = prev;
      }
    }
  });
});

describe("resolveOperatorStripeManagedPatchConflict", () => {
  it("allows seat limit patches for stripe-managed orgs", () => {
    expect(resolveOperatorStripeManagedPatchConflict("sub_1", { seatLimit: 5 })).toBeNull();
  });

  it("blocks billing metadata patches for stripe-managed orgs", () => {
    expect(resolveOperatorStripeManagedPatchConflict("sub_1", { billingPlan: "team" })).toBe(
      "billing_managed_by_stripe"
    );
    expect(resolveOperatorStripeManagedPatchConflict("sub_1", { subscriptionStatus: "active" })).toBe(
      "billing_managed_by_stripe"
    );
  });

  it("allows non-billing patches", () => {
    expect(resolveOperatorStripeManagedPatchConflict("sub_1", { name: "Acme" })).toBeNull();
  });

  it("allows billing patches when stripe is not managing the org", () => {
    expect(resolveOperatorStripeManagedPatchConflict(null, { billingPlan: "pro team" })).toBeNull();
  });
});
