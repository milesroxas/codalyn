import { describe, expect, it } from "vitest";

import { isBeaconTowerOriginConfigured, normalizeTowerOrigin, readBeaconTowerOrigin } from "./beacon-tower-origin";

describe("beacon-tower-origin", () => {
  it("normalizes a configured origin without its trailing slash", () => {
    expect(normalizeTowerOrigin("https://tower.codalyn.app/")).toBe("https://tower.codalyn.app");
    expect(normalizeTowerOrigin("https://tower.codalyn.app")).toBe("https://tower.codalyn.app");
  });

  it("treats an unset or empty origin as empty", () => {
    expect(normalizeTowerOrigin(undefined)).toBe("");
    expect(normalizeTowerOrigin("")).toBe("");
  });

  it("reads the origin baked into the build (Vitest bakes the fixed test origin)", () => {
    expect(readBeaconTowerOrigin()).toBe("https://tower.test");
    expect(isBeaconTowerOriginConfigured()).toBe(true);
  });
});
