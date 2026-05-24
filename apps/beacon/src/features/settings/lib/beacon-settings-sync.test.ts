import { describe, expect, it } from "vitest";

import {
  isBeaconTowerSettingsPullPending,
  isBeaconTowerSettingsPullSettled,
  isBeaconTowerSettingsSynced,
} from "./beacon-settings-sync";

describe("beacon-settings-sync", () => {
  it("treats guests as always ready", () => {
    expect(isBeaconTowerSettingsPullPending(false, "idle")).toBe(false);
    expect(isBeaconTowerSettingsSynced(false, "error")).toBe(true);
    expect(isBeaconTowerSettingsPullSettled(false, "loading")).toBe(true);
  });

  it("tracks Tower user pull lifecycle", () => {
    expect(isBeaconTowerSettingsPullPending(true, "loading")).toBe(true);
    expect(isBeaconTowerSettingsSynced(true, "loading")).toBe(false);
    expect(isBeaconTowerSettingsPullSettled(true, "loading")).toBe(false);

    expect(isBeaconTowerSettingsSynced(true, "synced")).toBe(true);
    expect(isBeaconTowerSettingsPullSettled(true, "synced")).toBe(true);

    expect(isBeaconTowerSettingsSynced(true, "error")).toBe(false);
    expect(isBeaconTowerSettingsPullSettled(true, "error")).toBe(true);
  });
});
