import { describe, expect, it } from "vitest";
import {
  getDefaultBeaconAppSettings,
  parseBeaconAppSettings,
  validateBeaconPresetStorageV2Patch,
} from "./beacon-app-settings.js";
import { BEACON_IMAGE_ERROR_CODES } from "./beacon-image-errors.js";
import { serializePresetTargetKey } from "./beacon-image-preset-domain.js";

describe("beacon app settings v2 preset storage", () => {
  it("loads legacy settings without crashing", () => {
    const parsed = parseBeaconAppSettings({
      version: 1,
      theme: "dark",
      defaultExportFormat: "webp",
      defaultExportQuality: 0.75,
      defaultAspectPreset: "free",
      imagePresets: [],
      designerOnlyImagePresets: [],
    });
    expect(parsed.version).toBe(1);
    expect(parsed.imagePresets).toEqual([]);
    expect(parsed.imagePresetStorageV2).toEqual({
      siteDefault: null,
      byTargetKey: {},
    });
  });

  it("keeps legacy preset rows readable", () => {
    const parsed = parseBeaconAppSettings({
      ...getDefaultBeaconAppSettings(),
      imagePresets: [{ id: "legacy_1", name: "Legacy", width: 1200, height: 800, maxFileSizeBytes: 100_000 }],
    });
    expect(parsed.imagePresets).toHaveLength(1);
    expect(parsed.imagePresets[0]?.id).toBe("legacy_1");
  });

  it("parses and canonicalizes v2 byTargetKey entries", () => {
    const row = {
      id: "row_1",
      name: "Row 1",
      width: 1200,
      height: 800,
      maxFileSizeBytes: 100_000,
      targetKey: {
        kind: "component-image-instance" as const,
        siteId: "site_1",
        pageId: "page_1",
        instanceElementId: "inst_1",
        imagePropId: "prop_1",
      },
    };
    const parsed = parseBeaconAppSettings({
      ...getDefaultBeaconAppSettings(),
      imagePresetStorageV2: {
        siteDefault: null,
        byTargetKey: {
          not_canonical: row,
        },
      },
    });
    const canonical = serializePresetTargetKey(row.targetKey);
    expect(parsed.imagePresetStorageV2?.byTargetKey[canonical]?.id).toBe("row_1");
    expect(Object.keys(parsed.imagePresetStorageV2?.byTargetKey ?? {})).toEqual([canonical]);
  });

  it("round-trips v2 settings without data loss", () => {
    const settings = {
      ...getDefaultBeaconAppSettings(),
      imagePresetStorageV2: {
        siteDefault: {
          id: "site_default",
          name: "Site default",
          width: 1400,
          height: 900,
          exportFormat: "avif" as const,
          maxFileSizeBytes: 120_000,
          targetKey: {
            kind: "site-default" as const,
            siteId: "site_1",
          },
        },
        byTargetKey: {
          [serializePresetTargetKey({
            kind: "bare-image-instance",
            siteId: "site_1",
            pageId: "page_1",
            elementId: "img_1",
          })]: {
            id: "inst_1",
            name: "Instance",
            width: 1000,
            height: 1000,
            exportFormat: "webp" as const,
            maxFileSizeBytes: 90_000,
            targetKey: {
              kind: "bare-image-instance" as const,
              siteId: "site_1",
              pageId: "page_1",
              elementId: "img_1",
            },
          },
        },
      },
    };
    const parsed = parseBeaconAppSettings(settings);
    expect(parsed.imagePresetStorageV2).toEqual(settings.imagePresetStorageV2);
  });

  it("rejects invalid target keys in v2 patch validation", () => {
    const result = validateBeaconPresetStorageV2Patch({
      imagePresetStorageV2: {
        siteDefault: null,
        byTargetKey: {
          anything: {
            id: "bad_1",
            name: "Bad",
            width: 1000,
            height: 1000,
            maxFileSizeBytes: 100_000,
            targetKey: {
              kind: "bare-image-instance",
              pageId: "page_1",
              elementId: "img_1",
            },
          },
        },
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe(BEACON_IMAGE_ERROR_CODES.PRESET_TARGET_KEY_INVALID);
    }
  });

  it("rejects duplicate canonical target keys in v2 patch validation", () => {
    const result = validateBeaconPresetStorageV2Patch({
      imagePresetStorageV2: {
        siteDefault: null,
        byTargetKey: {
          one: {
            id: "row_1",
            name: "One",
            width: 1000,
            height: 1000,
            maxFileSizeBytes: 100_000,
            targetKey: {
              kind: "bare-image-element",
              siteId: "site_1",
            },
          },
          two: {
            id: "row_2",
            name: "Two",
            width: 900,
            height: 900,
            maxFileSizeBytes: 100_000,
            targetKey: {
              kind: "bare-image-element",
              siteId: "site_1",
            },
          },
        },
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe(BEACON_IMAGE_ERROR_CODES.DUPLICATE_PRESET_TARGET);
    }
  });
});
