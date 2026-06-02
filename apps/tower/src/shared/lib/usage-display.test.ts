import { describe, expect, it } from "vitest";
import {
  accountSubscriptionPlanLabel,
  activeUsageTierLabel,
  usageLimitsPlanLabel,
  usageTierLabel,
} from "@/shared/lib/usage-display";

describe("usageTierLabel", () => {
  it("labels each usage tier distinctly", () => {
    expect(usageTierLabel("free")).toBe("Free");
    expect(usageTierLabel("pro")).toBe("Pro");
    expect(usageTierLabel("studio")).toBe("Studio");
    expect(usageTierLabel("team")).toBe("Team");
  });
});

describe("accountSubscriptionPlanLabel", () => {
  it("reflects the individual Stripe plan name", () => {
    expect(accountSubscriptionPlanLabel({ tier: "pro", source: "user_stripe" })).toBe("Pro");
    expect(accountSubscriptionPlanLabel({ tier: "studio", source: "user_stripe" })).toBe("Studio");
    expect(accountSubscriptionPlanLabel({ tier: "team", source: "workspace_team" })).toBe("Free");
  });
});

describe("activeUsageTierLabel", () => {
  it("reflects active workspace tier", () => {
    expect(activeUsageTierLabel({ tier: "team", source: "workspace_team" })).toBe("Team");
    expect(usageLimitsPlanLabel("team")).toBe("Team limits");
  });
});
