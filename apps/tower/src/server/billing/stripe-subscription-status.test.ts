import { describe, expect, it } from "vitest";
import {
  isStripeSubscriptionProEntitled,
  subscriptionPlanForStatus,
  userRowHasStripePro,
} from "@/server/billing/stripe-subscription-status";

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

describe("userRowHasStripePro", () => {
  it("requires plan, subscription id, and entitled status", () => {
    expect(
      userRowHasStripePro({
        subscriptionPlan: "pro",
        subscriptionStatus: "active",
        stripeSubscriptionId: "sub_1",
      })
    ).toBe(true);
  });

  it("rejects pro plan with non-entitled status", () => {
    expect(
      userRowHasStripePro({
        subscriptionPlan: "pro",
        subscriptionStatus: "canceled",
        stripeSubscriptionId: "sub_1",
      })
    ).toBe(false);
  });

  it("rejects free plan even when status looks active", () => {
    expect(
      userRowHasStripePro({
        subscriptionPlan: "free",
        subscriptionStatus: "active",
        stripeSubscriptionId: "sub_1",
      })
    ).toBe(false);
  });
});
