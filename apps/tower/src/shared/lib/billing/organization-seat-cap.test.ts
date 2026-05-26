import { describe, expect, it } from "vitest";
import {
  buildOrganizationSeatSnapshot,
  resolveMembershipSeatCapFromOrg,
  resolveOrganizationInvitationLimit,
} from "@/shared/lib/billing/organization-seat-cap";

describe("resolveMembershipSeatCapFromOrg", () => {
  it("uses seatLimit when set", () => {
    expect(resolveMembershipSeatCapFromOrg({ seatLimit: 5 })).toBe(5);
  });

  it("falls back to unpaid solo cap when seatLimit is null", () => {
    expect(resolveMembershipSeatCapFromOrg({ seatLimit: null })).toBe(1);
  });
});

describe("buildOrganizationSeatSnapshot", () => {
  it("marks solo unpaid workspace at cap", () => {
    expect(buildOrganizationSeatSnapshot(1, { seatLimit: null })).toEqual({
      seatsUsed: 1,
      effectiveSeatLimit: 1,
      isAtSeatCap: true,
      isOverSeatCap: false,
      seatsRemaining: 0,
    });
  });

  it("marks over-cap after subscription cancel", () => {
    expect(buildOrganizationSeatSnapshot(5, { seatLimit: null })).toEqual({
      seatsUsed: 5,
      effectiveSeatLimit: 1,
      isAtSeatCap: true,
      isOverSeatCap: true,
      seatsRemaining: 0,
    });
  });
});

describe("resolveOrganizationInvitationLimit", () => {
  it("allows one pending invite when one seat remains", () => {
    expect(resolveOrganizationInvitationLimit(1, { seatLimit: 2 })).toBe(1);
  });

  it("blocks pending invites when at cap", () => {
    expect(resolveOrganizationInvitationLimit(2, { seatLimit: 2 })).toBe(0);
  });
});
