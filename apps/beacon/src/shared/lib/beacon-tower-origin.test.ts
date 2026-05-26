import { describe, expect, it, vi } from "vitest";

import { isBeaconTowerOriginConfigured, readBeaconTowerOrigin } from "./beacon-tower-origin";

describe("beacon-tower-origin", () => {
  it("reads configured origin without trailing slash", () => {
    vi.stubEnv("VITE_TOWER_ORIGIN", "https://tower.codalyn.app/");
    expect(readBeaconTowerOrigin()).toBe("https://tower.codalyn.app");
    expect(isBeaconTowerOriginConfigured()).toBe(true);
    vi.unstubAllEnvs();
  });

  it("returns empty when unset", () => {
    vi.stubEnv("VITE_TOWER_ORIGIN", "");
    expect(readBeaconTowerOrigin()).toBe("");
    expect(isBeaconTowerOriginConfigured()).toBe(false);
    vi.unstubAllEnvs();
  });
});
