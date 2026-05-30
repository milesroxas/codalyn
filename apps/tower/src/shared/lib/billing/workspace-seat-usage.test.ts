import { describe, expect, it } from "vitest";
import {
  buildWorkspaceSeatUsage,
  formatWorkspaceSeatUsageLabel,
  shouldShowWorkspaceSeatBillingBreakdown,
  workspaceSeatBillingBreakdownLines,
} from "@/shared/lib/billing/workspace-seat-usage";

describe("buildWorkspaceSeatUsage", () => {
  it("uses seat_limit as effective cap", () => {
    expect(
      buildWorkspaceSeatUsage(2, {
        seatLimit: 10,
        stripeSeatQuantity: 3,
        operatorSeatLimitOverride: true,
      })
    ).toMatchObject({
      seatsUsed: 2,
      effectiveSeatLimit: 10,
      isAtSeatCap: false,
      seatsRemaining: 8,
    });
  });
});

describe("formatWorkspaceSeatUsageLabel", () => {
  it("pluralizes seats", () => {
    expect(formatWorkspaceSeatUsageLabel({ seatsUsed: 2, effectiveSeatLimit: 6 })).toBe("2 of 6 seats used");
  });

  it("singularizes one seat", () => {
    expect(formatWorkspaceSeatUsageLabel({ seatsUsed: 1, effectiveSeatLimit: 1 })).toBe("1 of 1 seat used");
  });
});

describe("workspace seat billing breakdown", () => {
  it("shows when operator override raises cap above Stripe", () => {
    const usage = buildWorkspaceSeatUsage(2, {
      seatLimit: 10,
      stripeSeatQuantity: 3,
      operatorSeatLimitOverride: true,
    });
    expect(shouldShowWorkspaceSeatBillingBreakdown(usage)).toBe(true);
    expect(workspaceSeatBillingBreakdownLines(usage)).toEqual({
      billedLabel: "3 billed on subscription",
      effectiveLabel: "10 allowed (operator grant)",
    });
  });

  it("hides when billed matches effective cap", () => {
    const usage = buildWorkspaceSeatUsage(2, { seatLimit: 6, stripeSeatQuantity: 6 });
    expect(shouldShowWorkspaceSeatBillingBreakdown(usage)).toBe(false);
  });
});
