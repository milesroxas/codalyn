import { describe, expect, it } from "vitest";
import { isOrganizationTeamEntitled } from "@/server/billing/organization-billing";
import {
  isStripeSubscriptionProEntitled,
  orgRowHasStripeTeam,
  subscriptionPlanForStatus,
  userRowHasIndividualPaidPlan,
  userRowIndividualPlan,
} from "@/server/billing/stripe-subscription-status";
import { TEAM_BILLING_PLAN } from "@/server/billing/team-billing-config";

describe("subscriptionPlanForStatus", () => {
  it("maps entitled statuses to pro", () => {
    expect(subscriptionPlanForStatus("active")).toBe("pro");
    expect(subscriptionPlanForStatus("trialing")).toBe("pro");
    expect(subscriptionPlanForStatus("past_due")).toBe("pro");
  });

  it("maps terminal or incomplete statuses to free", () => {
    expect(subscriptionPlanForStatus("canceled")).toBe("free");
    expect(subscriptionPlanForStatus("unpaid")).toBe("free");
    expect(subscriptionPlanForStatus("incomplete")).toBe("free");
  });
});

describe("isStripeSubscriptionProEntitled", () => {
  it("returns false for unknown stored strings", () => {
    expect(isStripeSubscriptionProEntitled("canceled")).toBe(false);
  });
});

describe("userRowIndividualPlan", () => {
  it("resolves pro when plan, subscription id, and status are entitled", () => {
    expect(
      userRowIndividualPlan({
        subscriptionPlan: "pro",
        subscriptionStatus: "active",
        stripeSubscriptionId: "sub_1",
      })
    ).toBe("pro");
  });

  it("resolves studio for an entitled studio row", () => {
    expect(
      userRowIndividualPlan({
        subscriptionPlan: "studio",
        subscriptionStatus: "active",
        stripeSubscriptionId: "sub_2",
      })
    ).toBe("studio");
  });

  it("returns null for a paid plan with non-entitled status", () => {
    expect(
      userRowIndividualPlan({
        subscriptionPlan: "studio",
        subscriptionStatus: "canceled",
        stripeSubscriptionId: "sub_2",
      })
    ).toBeNull();
  });

  it("returns null for free plan even when status looks active", () => {
    expect(
      userRowIndividualPlan({
        subscriptionPlan: "free",
        subscriptionStatus: "active",
        stripeSubscriptionId: "sub_1",
      })
    ).toBeNull();
  });
});

describe("userRowHasIndividualPaidPlan", () => {
  it("is true for an entitled pro or studio row", () => {
    expect(
      userRowHasIndividualPaidPlan({ subscriptionPlan: "pro", subscriptionStatus: "active", stripeSubscriptionId: "s" })
    ).toBe(true);
    expect(
      userRowHasIndividualPaidPlan({
        subscriptionPlan: "studio",
        subscriptionStatus: "trialing",
        stripeSubscriptionId: "s",
      })
    ).toBe(true);
  });

  it("is false without a subscription id", () => {
    expect(
      userRowHasIndividualPaidPlan({
        subscriptionPlan: "pro",
        subscriptionStatus: "active",
        stripeSubscriptionId: null,
      })
    ).toBe(false);
  });
});

describe("orgRowHasStripeTeam", () => {
  it("requires team plan, subscription id, and entitled status", () => {
    expect(
      orgRowHasStripeTeam({
        billingPlan: TEAM_BILLING_PLAN,
        subscriptionStatus: "active",
        stripeSubscriptionId: "sub_team_1",
      })
    ).toBe(true);
  });

  it("rejects individual pro plan on organization row", () => {
    expect(
      orgRowHasStripeTeam({
        billingPlan: "pro",
        subscriptionStatus: "active",
        stripeSubscriptionId: "sub_team_1",
      })
    ).toBe(false);
  });
});

describe("isOrganizationTeamEntitled", () => {
  it("grants pro for stripe team subscription", () => {
    expect(
      isOrganizationTeamEntitled({
        billingPlan: TEAM_BILLING_PLAN,
        subscriptionStatus: "active",
        stripeSubscriptionId: "sub_team_1",
      })
    ).toBe(true);
  });

  it("grants pro for operator-granted plan without stripe id", () => {
    expect(
      isOrganizationTeamEntitled({
        billingPlan: "pro team",
        subscriptionStatus: "active",
        stripeSubscriptionId: null,
      })
    ).toBe(true);
  });

  it("rejects canceled subscription", () => {
    expect(
      isOrganizationTeamEntitled({
        billingPlan: TEAM_BILLING_PLAN,
        subscriptionStatus: "canceled",
        stripeSubscriptionId: "sub_team_1",
      })
    ).toBe(false);
  });
});
