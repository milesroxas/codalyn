import { describe, expect, it } from "vitest";
import {
  buildWorkspaceSeatUsage,
  formatWorkspaceSeatUsageLabel,
  shouldShowWorkspaceSeatBillingBreakdown,
  workspacePaidSeatsAvailable,
  workspacePaidSeatsAvailableLabel,
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

describe("workspacePaidSeatsAvailable", () => {
  it("counts purchased seats not currently in use", () => {
    expect(workspacePaidSeatsAvailable({ seatsUsed: 4, stripeSeatQuantity: 6, operatorSeatLimitOverride: false })).toBe(
      2
    );
  });

  it("is zero when all purchased seats are in use", () => {
    expect(workspacePaidSeatsAvailable({ seatsUsed: 6, stripeSeatQuantity: 6, operatorSeatLimitOverride: false })).toBe(
      0
    );
  });

  it("never returns negative when usage exceeds purchased seats", () => {
    expect(workspacePaidSeatsAvailable({ seatsUsed: 8, stripeSeatQuantity: 6, operatorSeatLimitOverride: false })).toBe(
      0
    );
  });

  it("ignores operator-granted caps (not Stripe-billed) and unknown quantities", () => {
    expect(workspacePaidSeatsAvailable({ seatsUsed: 2, stripeSeatQuantity: 6, operatorSeatLimitOverride: true })).toBe(
      0
    );
    expect(
      workspacePaidSeatsAvailable({ seatsUsed: 2, stripeSeatQuantity: null, operatorSeatLimitOverride: false })
    ).toBe(0);
  });
});

describe("workspacePaidSeatsAvailableLabel", () => {
  it("nudges to release empty paid seats, pluralizing", () => {
    expect(workspacePaidSeatsAvailableLabel(2)).toBe(
      "2 paid seats available — reduce seats in the billing portal to stop paying for empty seats."
    );
  });

  it("singularizes one seat", () => {
    expect(workspacePaidSeatsAvailableLabel(1)).toBe(
      "1 paid seat available — reduce seats in the billing portal to stop paying for empty seats."
    );
  });

  it("returns null when no paid seats are unused", () => {
    expect(workspacePaidSeatsAvailableLabel(0)).toBeNull();
  });
});
