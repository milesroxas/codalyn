import { describe, expect, it } from "vitest";

import {
  beginBeaconTowerSignOut,
  invalidateBeaconTowerSignOut,
  isBeaconTowerSignOutCurrent,
} from "./beacon-tower-sign-out-coordination";

describe("beacon-tower-sign-out-coordination", () => {
  it("tracks a single in-flight sign-out", () => {
    const epoch = beginBeaconTowerSignOut();
    expect(isBeaconTowerSignOutCurrent(epoch)).toBe(true);
  });

  it("invalidates stale sign-out completion when a newer session arrives", () => {
    const epoch = beginBeaconTowerSignOut();
    invalidateBeaconTowerSignOut();
    expect(isBeaconTowerSignOutCurrent(epoch)).toBe(false);
  });

  it("starts a new sign-out after invalidation", () => {
    const first = beginBeaconTowerSignOut();
    invalidateBeaconTowerSignOut();
    const second = beginBeaconTowerSignOut();
    expect(isBeaconTowerSignOutCurrent(first)).toBe(false);
    expect(isBeaconTowerSignOutCurrent(second)).toBe(true);
  });
});
