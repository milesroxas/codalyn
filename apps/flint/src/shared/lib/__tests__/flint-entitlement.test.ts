import { describe, expect, it } from "vitest";
import { getDefaultFlintEntitlement, isPaidFlintTier, normalizeFlintEntitlement } from "@/shared/lib/flint-entitlement";

describe("normalizeFlintEntitlement", () => {
  it("parses a canonical object", () => {
    expect(normalizeFlintEntitlement({ tier: "team", source: "workspace_team" })).toEqual({
      tier: "team",
      source: "workspace_team",
    });
  });

  it("accepts the primitive (string) shape", () => {
    expect(normalizeFlintEntitlement("pro")).toEqual({ tier: "pro", source: "none" });
  });

  it("defaults to free on missing/malformed input", () => {
    expect(normalizeFlintEntitlement(null)).toEqual(getDefaultFlintEntitlement());
    expect(normalizeFlintEntitlement(undefined)).toEqual(getDefaultFlintEntitlement());
    expect(normalizeFlintEntitlement({})).toEqual(getDefaultFlintEntitlement());
    expect(normalizeFlintEntitlement({ tier: "enterprise" })).toEqual(getDefaultFlintEntitlement());
    expect(normalizeFlintEntitlement(42)).toEqual(getDefaultFlintEntitlement());
  });

  it("defaults unknown source to none but keeps a valid tier", () => {
    expect(normalizeFlintEntitlement({ tier: "studio", source: "bogus" })).toEqual({
      tier: "studio",
      source: "none",
    });
  });

  it("isPaidFlintTier treats only free as unpaid", () => {
    expect(isPaidFlintTier("free")).toBe(false);
    expect(isPaidFlintTier("pro")).toBe(true);
    expect(isPaidFlintTier("studio")).toBe(true);
    expect(isPaidFlintTier("team")).toBe(true);
  });
});
