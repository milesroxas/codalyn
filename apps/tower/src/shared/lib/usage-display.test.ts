import { describe, expect, it } from "vitest";
import { billingAccountPlanLabel } from "@/shared/lib/usage-display";

describe("billingAccountPlanLabel", () => {
  it("labels individual Stripe Pro", () => {
    expect(billingAccountPlanLabel({ tier: "pro", source: "user_stripe" })).toBe("Pro");
  });

  it("labels workspace Team entitlements", () => {
    expect(billingAccountPlanLabel({ tier: "pro", source: "organization" })).toBe("Team");
  });

  it("labels free accounts", () => {
    expect(billingAccountPlanLabel({ tier: "free", source: "none" })).toBe("Free");
  });
});
