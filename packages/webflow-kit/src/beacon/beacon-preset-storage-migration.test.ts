import { describe, expect, it } from "vitest";
import { getDefaultBeaconAppSettings } from "./beacon-app-settings.js";
import { serializePresetTargetKey } from "./beacon-image-preset-domain.js";
import {
  beaconAppSettingsPayloadNeedsMigration,
  beaconOrgTeamSettingsPayloadNeedsMigration,
  hasLegacyBeaconPresetStorageKeys,
  migrateBeaconAppSettingsPayload,
  migrateBeaconOrgTeamSettingsPayload,
} from "./beacon-preset-storage-migration.js";

describe("beacon preset storage migration", () => {
  it("detects legacy preset keys", () => {
    expect(hasLegacyBeaconPresetStorageKeys({ imagePresets: [] })).toBe(true);
    expect(hasLegacyBeaconPresetStorageKeys({ imagePresetStorageV2: { siteDefault: null, byTargetKey: {} } })).toBe(
      true
    );
    expect(hasLegacyBeaconPresetStorageKeys(getDefaultBeaconAppSettings())).toBe(false);
  });

  it("migrates legacy flat preset arrays and v2 storage key on user payloads", () => {
    const row = {
      id: "site_default",
      name: "Site default",
      width: 1400,
      height: 900,
      maxFileSizeBytes: 120_000,
      targetKey: { kind: "site-default" as const, siteId: "site_1" },
    };
    const raw = {
      ...getDefaultBeaconAppSettings(),
      imagePresets: [{ id: "legacy", name: "Legacy", width: 1200, height: 800, maxFileSizeBytes: 100_000 }],
      imagePresetStorageV2: {
        siteDefault: row,
        byTargetKey: {},
      },
    };
    expect(beaconAppSettingsPayloadNeedsMigration(raw)).toBe(true);
    const migrated = migrateBeaconAppSettingsPayload(raw);
    expect(migrated.imagePresetStorage.siteDefault).toEqual(row);
    expect(migrated).not.toHaveProperty("imagePresets");
    expect(migrated).not.toHaveProperty("imagePresetStorageV2");
    expect(beaconAppSettingsPayloadNeedsMigration(migrated)).toBe(false);
  });

  it("migrates org team settings with legacy storage key", () => {
    const key = serializePresetTargetKey({ kind: "bare-image-element", siteId: "site_1" });
    const raw = {
      imagePresetStorageV2: {
        siteDefault: null,
        byTargetKey: {
          [key]: {
            id: "row_1",
            name: "Element",
            width: 1200,
            height: 800,
            maxFileSizeBytes: 100_000,
            targetKey: { kind: "bare-image-element" as const, siteId: "site_1" },
          },
        },
      },
    };
    expect(beaconOrgTeamSettingsPayloadNeedsMigration(raw)).toBe(true);
    const migrated = migrateBeaconOrgTeamSettingsPayload(raw);
    expect(migrated?.imagePresetStorage?.byTargetKey[key]?.id).toBe("row_1");
    expect(beaconOrgTeamSettingsPayloadNeedsMigration(migrated)).toBe(false);
  });

  it("is idempotent for canonical payloads", () => {
    const settings = getDefaultBeaconAppSettings();
    expect(migrateBeaconAppSettingsPayload(settings)).toEqual(settings);
    expect(beaconOrgTeamSettingsPayloadNeedsMigration(null)).toBe(false);
  });
});
