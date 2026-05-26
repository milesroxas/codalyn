import { describe, expect, it } from "vitest";
import {
  assertOrganizationSeatAvailable,
  buildOrganizationSeatSnapshot,
} from "@/server/billing/organization-seat-count";

describe("buildOrganizationSeatSnapshot", () => {
  it("uses unpaid solo cap when seatLimit is null", () => {
    expect(buildOrganizationSeatSnapshot(1, { seatLimit: null })).toEqual({
      seatsUsed: 1,
      effectiveSeatLimit: 1,
      isAtSeatCap: true,
    });
  });

  it("allows invites when paid seat limit exceeds usage", () => {
    expect(buildOrganizationSeatSnapshot(1, { seatLimit: 5 })).toEqual({
      seatsUsed: 1,
      effectiveSeatLimit: 5,
      isAtSeatCap: false,
    });
  });
});

describe("assertOrganizationSeatAvailable", () => {
  it("is exported for organization hooks", () => {
    expect(typeof assertOrganizationSeatAvailable).toBe("function");
  });
});
