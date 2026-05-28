import { describe, expect, it } from "vitest";
import {
  isIndividualUserStripeSubscriptionMetadata,
  STRIPE_BILLING_SCOPE_ORGANIZATION,
  STRIPE_BILLING_SCOPE_USER,
} from "@/server/billing/stripe-metadata";

describe("isIndividualUserStripeSubscriptionMetadata", () => {
  it("allows individual Pro checkout metadata", () => {
    expect(
      isIndividualUserStripeSubscriptionMetadata({
        towerUserId: "user_1",
        towerBillingScope: STRIPE_BILLING_SCOPE_USER,
      })
    ).toBe(true);
  });

  it("rejects workspace team checkout metadata", () => {
    expect(
      isIndividualUserStripeSubscriptionMetadata({
        towerOrgId: "org_1",
        towerUserId: "user_1",
        towerBillingScope: STRIPE_BILLING_SCOPE_ORGANIZATION,
      })
    ).toBe(false);
  });

  it("rejects metadata with towerOrgId even when scope is missing", () => {
    expect(
      isIndividualUserStripeSubscriptionMetadata({
        towerOrgId: "org_1",
        towerUserId: "user_1",
      })
    ).toBe(false);
  });
});
