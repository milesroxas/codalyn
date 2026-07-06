import { describe, expect, it } from "vitest";
import { normalizeTowerAccessPolicy, resolveTowerEarlyAccessRequired } from "./access-policy";

describe("normalizeTowerAccessPolicy", () => {
  it("reads the canonical boolean shape", () => {
    expect(normalizeTowerAccessPolicy({ earlyAccessRequired: true })).toEqual({ earlyAccessRequired: true });
    expect(normalizeTowerAccessPolicy({ earlyAccessRequired: false })).toEqual({ earlyAccessRequired: false });
  });

  it("reads equivalent wrapped / string / number shapes", () => {
    expect(normalizeTowerAccessPolicy({ earlyAccessRequired: { value: "true" } })).toEqual({
      earlyAccessRequired: true,
    });
    expect(normalizeTowerAccessPolicy({ earlyAccessRequired: "no" })).toEqual({ earlyAccessRequired: false });
    expect(normalizeTowerAccessPolicy({ earlyAccessRequired: 1 })).toEqual({ earlyAccessRequired: true });
  });

  it("returns null for missing / malformed bodies", () => {
    expect(normalizeTowerAccessPolicy(null)).toBeNull();
    expect(normalizeTowerAccessPolicy("nope")).toBeNull();
    expect(normalizeTowerAccessPolicy({})).toBeNull();
    expect(normalizeTowerAccessPolicy({ earlyAccessRequired: "maybe" })).toBeNull();
  });
});

describe("resolveTowerEarlyAccessRequired (fail-closed)", () => {
  it("returns the parsed value when valid", () => {
    expect(resolveTowerEarlyAccessRequired({ earlyAccessRequired: false })).toBe(false);
    expect(resolveTowerEarlyAccessRequired({ earlyAccessRequired: true })).toBe(true);
  });

  it("defaults to required (true) for missing / malformed input", () => {
    expect(resolveTowerEarlyAccessRequired(null)).toBe(true);
    expect(resolveTowerEarlyAccessRequired(undefined)).toBe(true);
    expect(resolveTowerEarlyAccessRequired({})).toBe(true);
    expect(resolveTowerEarlyAccessRequired({ earlyAccessRequired: "garbage" })).toBe(true);
  });
});
