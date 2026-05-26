import { z } from "zod";

import { DEFAULT_IMAGE_EXPORT_FORMAT } from "../image/output-formats.js";
import { BEACON_IMAGE_ERROR_CODES, type BeaconImageErrorCode } from "./beacon-image-errors.js";
import {
  type BeaconPresetRow,
  coalesceBeaconPresetStorage,
  isPresetTargetKey,
  type PresetTargetKeyString,
  serializePresetTargetKey,
} from "./beacon-image-preset-domain.js";

const WEBP_AVIF = z.enum(["webp", "avif"]);

export const beaconAspectPresetSchema = z.enum(["free", "1", "16-9", "4-3", "3-2", "9-16"]);

export type BeaconAspectPreset = z.infer<typeof beaconAspectPresetSchema>;

export const beaconThemePreferenceSchema = z.enum(["light", "dark", "system"]);

export type BeaconThemePreference = z.infer<typeof beaconThemePreferenceSchema>;

const PRESET_EDGE = z.number().int().min(1).max(8192);

/**
 * Default encoded-size cap for presets (invalid-input fallback).
 * ~100 KB keeps exports lean for fast LCP and small transfer sizes.
 */
export const BEACON_PRESET_DEFAULT_MAX_FILE_BYTES = 100 * 1024;

/** Allowed range for `maxFileSizeBytes` on image presets (export UX). */
export const BEACON_PRESET_MAX_FILE_BYTES_MIN = 1024;
export const BEACON_PRESET_MAX_FILE_BYTES_MAX = 50 * 1024 * 1024;

const beaconPresetInstanceLocationSchema = z.object({
  pageId: z.string().min(1),
  pageName: z.string().min(1),
  pageKind: z.enum(["static", "cms"]),
  collectionId: z.string().min(1).optional(),
});

const beaconImagePresetRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  width: PRESET_EDGE,
  height: PRESET_EDGE,
  /** When omitted, app default export format applies. */
  exportFormat: WEBP_AVIF.optional(),
  /** Export must not exceed this encoded size when the preset is active (bytes). */
  maxFileSizeBytes: z.number().int().min(BEACON_PRESET_MAX_FILE_BYTES_MIN).max(BEACON_PRESET_MAX_FILE_BYTES_MAX),
  instanceLocation: beaconPresetInstanceLocationSchema.optional(),
});

const beaconPresetTargetKeySchema = z.custom<BeaconPresetRow["targetKey"]>(isPresetTargetKey);

export const beaconPresetRowSchema = beaconImagePresetRowSchema.extend({
  targetKey: beaconPresetTargetKeySchema,
});

export const beaconPresetStorageSchema = z.object({
  siteDefault: beaconPresetRowSchema.nullable(),
  byTargetKey: z.record(z.string(), beaconPresetRowSchema),
});

export type BeaconPresetStorage = {
  siteDefault: BeaconPresetRow | null;
  byTargetKey: Record<PresetTargetKeyString, BeaconPresetRow>;
};

export type BeaconPresetStorageValidationResult =
  | { ok: true; value: BeaconPresetStorage }
  | {
      ok: false;
      errorCode:
        | typeof BEACON_IMAGE_ERROR_CODES.PRESET_TARGET_KEY_INVALID
        | typeof BEACON_IMAGE_ERROR_CODES.DUPLICATE_PRESET_TARGET;
    };

/** Built-in crop aspect options (same set as the image editor preset strip). Order is display order. */
export const BEACON_BUILTIN_ASPECT_PRESETS: readonly BeaconAspectPreset[] = ["free", "1", "16-9", "4-3", "3-2", "9-16"];

export const beaconAppSettingsSchema = z.object({
  version: z.literal(1),
  theme: beaconThemePreferenceSchema,
  defaultExportFormat: WEBP_AVIF,
  /** Encoder quality, 0–1 (matches image editor slider). */
  defaultExportQuality: z.number().min(0).max(1),
  defaultAspectPreset: beaconAspectPresetSchema,
  imagePresetStorage: beaconPresetStorageSchema.default({
    siteDefault: null,
    byTargetKey: {},
  }),
  /** Built-in aspects removed from the crop preset strip; empty means all built-ins are shown. */
  hiddenBuiltinAspectPresets: z.array(beaconAspectPresetSchema).default([]),
  /**
   * When true, the crop preview zoom cannot exceed roughly 1:1 source pixels (avoids upscaled blur).
   */
  limitCropZoomToNativeResolution: z.boolean().default(false),
  /**
   * CMS layout-composition editor (Tower ↔ Webflow `fieldData`); internal wiring, not shown in Beacon UI.
   */
  cmsLayout: z
    .object({
      fieldSlug: z.string().default(""),
      enabledCollections: z.array(z.string().min(1)).default([]),
    })
    .default({ fieldSlug: "", enabledCollections: [] }),
});

export type BeaconAppSettings = z.infer<typeof beaconAppSettingsSchema>;

function normalizeBeaconPresetStorageInternal(input: BeaconPresetStorage): BeaconPresetStorageValidationResult {
  const byTargetKey: Record<PresetTargetKeyString, BeaconPresetRow> = {};
  const seen = new Set<string>();

  const addRow = (row: BeaconPresetRow, includeInByTargetKey: boolean): BeaconPresetStorageValidationResult => {
    let serialized: PresetTargetKeyString;
    try {
      serialized = serializePresetTargetKey(row.targetKey);
    } catch {
      return { ok: false, errorCode: BEACON_IMAGE_ERROR_CODES.PRESET_TARGET_KEY_INVALID };
    }
    if (seen.has(serialized)) {
      return { ok: false, errorCode: BEACON_IMAGE_ERROR_CODES.DUPLICATE_PRESET_TARGET };
    }
    seen.add(serialized);
    if (includeInByTargetKey) {
      byTargetKey[serialized] = row;
    }
    return { ok: true, value: { siteDefault: null, byTargetKey } };
  };

  if (input.siteDefault !== null) {
    const siteDefaultResult = addRow(input.siteDefault, true);
    if (!siteDefaultResult.ok) {
      return siteDefaultResult;
    }
  }

  for (const row of Object.values(input.byTargetKey)) {
    const result = addRow(row, true);
    if (!result.ok) {
      return result;
    }
  }

  return {
    ok: true,
    value: coalesceBeaconPresetStorage({
      siteDefault: input.siteDefault,
      byTargetKey,
    }),
  };
}

export function normalizeBeaconPresetStorage(raw: unknown): BeaconPresetStorageValidationResult {
  const parsed = beaconPresetStorageSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errorCode: BEACON_IMAGE_ERROR_CODES.PRESET_TARGET_KEY_INVALID,
    };
  }
  return normalizeBeaconPresetStorageInternal(parsed.data as BeaconPresetStorage);
}

export function validateBeaconPresetStoragePatch(raw: unknown):
  | {
      ok: true;
      normalizedPatch: unknown;
    }
  | {
      ok: false;
      errorCode: Extract<BeaconImageErrorCode, "PRESET_TARGET_KEY_INVALID" | "DUPLICATE_PRESET_TARGET">;
    } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: true, normalizedPatch: raw };
  }
  const record = raw as Record<string, unknown>;
  if (!Object.keys(record).includes("imagePresetStorage")) {
    return { ok: true, normalizedPatch: record };
  }
  if (record.imagePresetStorage === undefined) {
    return { ok: true, normalizedPatch: record };
  }
  const normalized = normalizeBeaconPresetStorage(record.imagePresetStorage);
  if (!normalized.ok) {
    return { ok: false, errorCode: normalized.errorCode };
  }
  return {
    ok: true,
    normalizedPatch: {
      ...record,
      imagePresetStorage: normalized.value,
    },
  };
}

export function getDefaultBeaconAppSettings(): BeaconAppSettings {
  return {
    version: 1,
    theme: "dark",
    defaultExportFormat: DEFAULT_IMAGE_EXPORT_FORMAT,
    defaultExportQuality: 0.75,
    defaultAspectPreset: "free",
    imagePresetStorage: {
      siteDefault: null,
      byTargetKey: {},
    },
    hiddenBuiltinAspectPresets: [],
    limitCropZoomToNativeResolution: false,
    cmsLayout: {
      fieldSlug: "",
      enabledCollections: [],
    },
  };
}

export function getVisibleBuiltinAspectPresets(settings: BeaconAppSettings): BeaconAspectPreset[] {
  const hidden = new Set(settings.hiddenBuiltinAspectPresets);
  return BEACON_BUILTIN_ASPECT_PRESETS.filter((p) => !hidden.has(p));
}

export function parseBeaconAppSettings(raw: unknown): BeaconAppSettings {
  let prepped: unknown = raw;
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    if (record.imagePresetStorage !== undefined) {
      const normalized = normalizeBeaconPresetStorage(record.imagePresetStorage);
      prepped = {
        ...record,
        imagePresetStorage: normalized.ok ? normalized.value : getDefaultBeaconAppSettings().imagePresetStorage,
      };
    }
  }
  const parsed = beaconAppSettingsSchema.safeParse(prepped);
  if (parsed.success) {
    return parsed.data;
  }
  return getDefaultBeaconAppSettings();
}

/** Deep-enough merge for persisted JSON: `patch` wins per-field; arrays replaced when provided. */
export function mergeBeaconAppSettings(base: BeaconAppSettings, patch: Partial<BeaconAppSettings>): BeaconAppSettings {
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  ) as Partial<BeaconAppSettings>;
  return beaconAppSettingsSchema.parse({
    ...base,
    ...clean,
    imagePresetStorage: clean.imagePresetStorage ?? base.imagePresetStorage,
    cmsLayout: clean.cmsLayout ?? base.cmsLayout,
  });
}

export function parseBeaconAppSettingsPartial(raw: unknown): Partial<BeaconAppSettings> {
  const normalizedPatch = validateBeaconPresetStoragePatch(raw);
  if (!normalizedPatch.ok) {
    return {};
  }
  const parsed = beaconAppSettingsSchema.partial().safeParse(normalizedPatch.normalizedPatch);
  if (parsed.success) {
    return parsed.data;
  }
  return {};
}
