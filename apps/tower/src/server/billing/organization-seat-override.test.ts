import { describe, expect, it } from "vitest";
import {
  resolveOrganizationSeatLimitAfterStripeQuantity,
  shouldSkipStripeSeatQuantitySync,
} from "@/server/billing/organization-seat-override";

describe("shouldSkipStripeSeatQuantitySync", () => {
  it("skips sync when operator override is active", () => {
    expect(shouldSkipStripeSeatQuantitySync({ operatorSeatLimitOverride: true })).toBe(true);
  });

  it("allows sync when override is inactive", () => {
    expect(shouldSkipStripeSeatQuantitySync({ operatorSeatLimitOverride: false })).toBe(false);
  });
});

describe("resolveOrganizationSeatLimitAfterStripeQuantity", () => {
  it("clears seat limit when not entitled", () => {
    expect(
      resolveOrganizationSeatLimitAfterStripeQuantity(
        { seatLimit: 10, operatorSeatLimitOverride: true, stripeSeatQuantity: 3 },
        5,
        false
      )
    ).toBeNull();
  });

  it("preserves operator seat cap when override is active", () => {
    expect(
      resolveOrganizationSeatLimitAfterStripeQuantity(
        { seatLimit: 10, operatorSeatLimitOverride: true, stripeSeatQuantity: 3 },
        5,
        true
      )
    ).toBe(10);
  });

  it("uses stripe quantity when override is inactive", () => {
    expect(
      resolveOrganizationSeatLimitAfterStripeQuantity(
        { seatLimit: 10, operatorSeatLimitOverride: false, stripeSeatQuantity: 3 },
        5,
        true
      )
    ).toBe(5);
  });
});
