import { describe, expect, it } from "vitest";
import { resolveUsageScope } from "@/server/billing/usage-gate";
import { resolvePooledSeatCount } from "@/shared/lib/billing/organization-seat-cap";

describe("resolveUsageScope", () => {
  it("pools usage on the active paid Team workspace", () => {
    expect(resolveUsageScope("team", "user-1", "org-1")).toEqual({ kind: "workspace", organizationId: "org-1" });
  });

  it("falls back to user scope for Team with no active workspace", () => {
    expect(resolveUsageScope("team", "user-1", null)).toEqual({ kind: "user", userId: "user-1" });
  });

  it("keeps individual plans user-scoped even with an active workspace", () => {
    for (const tier of ["free", "pro", "studio"] as const) {
      expect(resolveUsageScope(tier, "user-1", "org-1")).toEqual({ kind: "user", userId: "user-1" });
    }
  });
});

describe("resolvePooledSeatCount", () => {
  it("prefers the Stripe-synced paid seat quantity", () => {
    expect(resolvePooledSeatCount({ stripeSeatQuantity: 9, seatLimit: 6 }, 6)).toBe(9);
  });

  it("falls back to the stored seat cap when no Stripe quantity", () => {
    expect(resolvePooledSeatCount({ stripeSeatQuantity: null, seatLimit: 8 }, 6)).toBe(8);
  });

  it("never drops below the team minimum", () => {
    expect(resolvePooledSeatCount({ stripeSeatQuantity: 2, seatLimit: null }, 6)).toBe(6);
    expect(resolvePooledSeatCount({ stripeSeatQuantity: null, seatLimit: null }, 6)).toBe(6);
  });
});
