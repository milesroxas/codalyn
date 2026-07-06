import { describe, expect, it } from "vitest";
import {
  formatTeamSeatCostPreview,
  getTeamSeatCostPreviewParts,
  type TeamSeatPrice,
} from "@/shared/lib/billing/team-seat-price";

const USD_MONTHLY: TeamSeatPrice = { unitAmount: 1500, currency: "usd", interval: "month" };

describe("getTeamSeatCostPreviewParts", () => {
  it("splits the preview into per-seat, count, total, and interval", () => {
    expect(getTeamSeatCostPreviewParts(USD_MONTHLY, 3)).toEqual({
      perSeat: "$15.00",
      seats: 3,
      total: "$45.00",
      interval: "mo",
    });
  });

  it("returns null when no price is available", () => {
    expect(getTeamSeatCostPreviewParts(null, 3)).toBeNull();
  });

  it("returns null for non-positive or non-integer seat counts", () => {
    expect(getTeamSeatCostPreviewParts(USD_MONTHLY, 0)).toBeNull();
    expect(getTeamSeatCostPreviewParts(USD_MONTHLY, 1.5)).toBeNull();
  });
});

describe("formatTeamSeatCostPreview", () => {
  it("builds a per-seat × count = total line for a monthly USD price", () => {
    expect(formatTeamSeatCostPreview(USD_MONTHLY, 6)).toBe("$15.00/seat × 6 = $90.00/mo");
  });

  it("uses the yearly suffix for annual prices", () => {
    expect(formatTeamSeatCostPreview({ unitAmount: 12_000, currency: "usd", interval: "year" }, 2)).toBe(
      "$120.00/seat × 2 = $240.00/yr"
    );
  });

  it("handles zero-decimal currencies without dividing by 100 (JPY)", () => {
    expect(formatTeamSeatCostPreview({ unitAmount: 2000, currency: "jpy", interval: "month" }, 3)).toBe(
      "¥2,000/seat × 3 = ¥6,000/mo"
    );
  });

  it("returns null when no price is available", () => {
    expect(formatTeamSeatCostPreview(null, 6)).toBeNull();
  });

  it("returns null for non-positive or non-integer seat counts", () => {
    expect(formatTeamSeatCostPreview(USD_MONTHLY, 0)).toBeNull();
    expect(formatTeamSeatCostPreview(USD_MONTHLY, -2)).toBeNull();
    expect(formatTeamSeatCostPreview(USD_MONTHLY, 1.5)).toBeNull();
  });
});
