import { describe, expect, it } from "vitest";
import {
  parseRequestedSeatQuantity,
  resolveCheckoutSeatQuantity,
  resolveSeatFloor,
  resolveSyncedSeatQuantity,
} from "@/server/billing/team-seat-quantity";

describe("resolveSeatFloor", () => {
  it("uses the team minimum when usage is below it", () => {
    expect(resolveSeatFloor(6, 1)).toBe(6);
  });

  it("uses current usage when it exceeds the minimum", () => {
    expect(resolveSeatFloor(6, 9)).toBe(9);
  });
});

describe("parseRequestedSeatQuantity", () => {
  it("accepts a positive integer number (canonical shape)", () => {
    expect(parseRequestedSeatQuantity(10)).toBe(10);
  });

  it("accepts a numeric string (alternate form-encoded shape)", () => {
    expect(parseRequestedSeatQuantity("10")).toBe(10);
    expect(parseRequestedSeatQuantity("  8  ")).toBe(8);
  });

  it("returns null for missing values", () => {
    expect(parseRequestedSeatQuantity(undefined)).toBeNull();
    expect(parseRequestedSeatQuantity(null)).toBeNull();
    expect(parseRequestedSeatQuantity("")).toBeNull();
  });

  it("returns null for malformed values", () => {
    expect(parseRequestedSeatQuantity("abc")).toBeNull();
    expect(parseRequestedSeatQuantity("6.5")).toBeNull();
    expect(parseRequestedSeatQuantity(6.5)).toBeNull();
    expect(parseRequestedSeatQuantity("-3")).toBeNull();
    expect(parseRequestedSeatQuantity(-3)).toBeNull();
    expect(parseRequestedSeatQuantity("0")).toBeNull();
    expect(parseRequestedSeatQuantity(0)).toBeNull();
    expect(parseRequestedSeatQuantity(Number.NaN)).toBeNull();
    expect(parseRequestedSeatQuantity({ value: "10" })).toBeNull();
  });
});

describe("resolveCheckoutSeatQuantity", () => {
  it("uses the selected seats when at or above the floor", () => {
    expect(resolveCheckoutSeatQuantity(6, 10, 500)).toBe(10);
    expect(resolveCheckoutSeatQuantity(6, 6, 500)).toBe(6);
  });

  it("clamps a below-floor selection up to the floor (never undercharges)", () => {
    expect(resolveCheckoutSeatQuantity(6, 3, 500)).toBe(6);
  });

  it("falls back to the floor when no selection is provided", () => {
    expect(resolveCheckoutSeatQuantity(6, null, 500)).toBe(6);
  });

  it("caps an over-large request at the max (fat-finger / abuse guard)", () => {
    expect(resolveCheckoutSeatQuantity(6, 10_000, 500)).toBe(500);
  });

  it("never pulls the upper bound below the floor", () => {
    expect(resolveCheckoutSeatQuantity(800, 10_000, 500)).toBe(800);
  });
});

describe("resolveSyncedSeatQuantity", () => {
  it("keeps purchased seats when members leave (grow-only)", () => {
    expect(resolveSyncedSeatQuantity(6, 10)).toBe(10);
  });

  it("grows to the floor when members exceed purchased seats", () => {
    expect(resolveSyncedSeatQuantity(12, 10)).toBe(12);
  });

  it("falls back to the floor when the subscription quantity is unknown", () => {
    expect(resolveSyncedSeatQuantity(6, null)).toBe(6);
  });
});
