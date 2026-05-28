import { describe, expect, it } from "vitest";
import {
  accountSubscriptionPlanLabel,
  activeUsageTierLabel,
  buildBillingPlanPresentation,
  usageLimitsPlanLabel,
  usageTierLabel,
} from "@/shared/lib/usage-display";

describe("usageTierLabel", () => {
  it("labels each usage tier distinctly", () => {
    expect(usageTierLabel("free")).toBe("Free");
    expect(usageTierLabel("pro")).toBe("Pro");
    expect(usageTierLabel("team")).toBe("Team");
  });
});

describe("accountSubscriptionPlanLabel", () => {
  it("is Pro only for individual Stripe", () => {
    expect(accountSubscriptionPlanLabel({ tier: "pro", source: "user_stripe" })).toBe("Pro");
    expect(accountSubscriptionPlanLabel({ tier: "team", source: "workspace_team" })).toBe("Free");
  });
});

describe("buildBillingPlanPresentation", () => {
  it("separates Team workspace usage from account subscription", () => {
    const presentation = buildBillingPlanPresentation({ tier: "team", source: "workspace_team" });
    expect(presentation.accountPlan).toBe("Free");
    expect(presentation.usageLimits).toBe("Team limits");
    expect(presentation.accountDetail).toContain("No individual Pro");
    expect(presentation.usageDetail).toContain("Team limits");
  });

  it("describes individual Pro usage context", () => {
    const presentation = buildBillingPlanPresentation({ tier: "pro", source: "user_stripe" });
    expect(presentation.usageLimits).toBe("Pro limits");
    expect(presentation.usageDetail).toContain("Team limits");
  });
});

describe("activeUsageTierLabel", () => {
  it("reflects active workspace tier", () => {
    expect(activeUsageTierLabel({ tier: "team", source: "workspace_team" })).toBe("Team");
    expect(usageLimitsPlanLabel("team")).toBe("Team limits");
  });
});
