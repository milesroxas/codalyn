import { describe, expect, it } from "vitest";

import { normalizeBeaconTowerAccessPolicy } from "./beacon-tower-access-policy";

describe("normalizeBeaconTowerAccessPolicy", () => {
  it("reads the canonical boolean shape", () => {
    expect(normalizeBeaconTowerAccessPolicy({ earlyAccessRequired: true })).toEqual({ earlyAccessRequired: true });
    expect(normalizeBeaconTowerAccessPolicy({ earlyAccessRequired: false })).toEqual({ earlyAccessRequired: false });
  });

  it("accepts equivalent string and number forms", () => {
    expect(normalizeBeaconTowerAccessPolicy({ earlyAccessRequired: "true" })).toEqual({ earlyAccessRequired: true });
    expect(normalizeBeaconTowerAccessPolicy({ earlyAccessRequired: "false" })).toEqual({ earlyAccessRequired: false });
    expect(normalizeBeaconTowerAccessPolicy({ earlyAccessRequired: 1 })).toEqual({ earlyAccessRequired: true });
    expect(normalizeBeaconTowerAccessPolicy({ earlyAccessRequired: 0 })).toEqual({ earlyAccessRequired: false });
  });

  it("accepts the wrapped `{ value }` form", () => {
    expect(normalizeBeaconTowerAccessPolicy({ earlyAccessRequired: { value: true } })).toEqual({
      earlyAccessRequired: true,
    });
  });

  it("returns null for missing fields", () => {
    expect(normalizeBeaconTowerAccessPolicy({})).toBeNull();
    expect(normalizeBeaconTowerAccessPolicy(null)).toBeNull();
    expect(normalizeBeaconTowerAccessPolicy(undefined)).toBeNull();
  });

  it("returns null for malformed fields", () => {
    expect(normalizeBeaconTowerAccessPolicy({ earlyAccessRequired: "maybe" })).toBeNull();
    expect(normalizeBeaconTowerAccessPolicy({ earlyAccessRequired: 2 })).toBeNull();
    expect(normalizeBeaconTowerAccessPolicy({ earlyAccessRequired: "" })).toBeNull();
    expect(normalizeBeaconTowerAccessPolicy("true")).toBeNull();
  });
});
