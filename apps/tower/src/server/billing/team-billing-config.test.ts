import { describe, expect, it } from "vitest";
import { getTeamMinSeats, resolveMembershipSeatCapFromOrg } from "@/server/billing/team-billing-config";

describe("getTeamMinSeats", () => {
  it("defaults to 2 when env unset", () => {
    expect(getTeamMinSeats()).toBe(2);
  });
});

describe("resolveMembershipSeatCapFromOrg", () => {
  it("uses seatLimit when set", () => {
    expect(resolveMembershipSeatCapFromOrg({ seatLimit: 5 })).toBe(5);
  });

  it("floors invalid seatLimit to at least 1", () => {
    expect(resolveMembershipSeatCapFromOrg({ seatLimit: 0 })).toBe(1);
  });

  it("falls back to unpaid cap when seatLimit is null", () => {
    expect(resolveMembershipSeatCapFromOrg({ seatLimit: null })).toBe(10_000);
  });
});
