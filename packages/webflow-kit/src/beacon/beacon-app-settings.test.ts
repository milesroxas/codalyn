import { describe, expect, it } from "vitest";
import {
  getDefaultBeaconAppSettings,
  parseBeaconAppSettings,
  validateBeaconPresetStoragePatch,
} from "./beacon-app-settings.js";
import { BEACON_IMAGE_ERROR_CODES } from "./beacon-image-errors.js";
import { serializePresetTargetKey } from "./beacon-image-preset-domain.js";

describe("beacon app settings preset storage", () => {
  it("returns defaults for fresh install payload", () => {
    const parsed = parseBeaconAppSettings({});
    expect(parsed).toEqual(getDefaultBeaconAppSettings());
  });

  it("parses and canonicalizes byTargetKey entries", () => {
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
      imagePresetStorage: {
        siteDefault: null,
        byTargetKey: {
          not_canonical: row,
        },
      },
    });
    const canonical = serializePresetTargetKey(row.targetKey);
    expect(parsed.imagePresetStorage?.byTargetKey[canonical]?.id).toBe("row_1");
    expect(Object.keys(parsed.imagePresetStorage?.byTargetKey ?? {})).toEqual([canonical]);
  });

  it("round-trips preset storage without data loss", () => {
    const settings = {
      ...getDefaultBeaconAppSettings(),
      imagePresetStorage: {
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
    expect(parsed.imagePresetStorage).toEqual(settings.imagePresetStorage);
  });

  it("rejects invalid target keys in patch validation", () => {
    const result = validateBeaconPresetStoragePatch({
      imagePresetStorage: {
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

  it("rejects duplicate canonical target keys in patch validation", () => {
    const result = validateBeaconPresetStoragePatch({
      imagePresetStorage: {
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
