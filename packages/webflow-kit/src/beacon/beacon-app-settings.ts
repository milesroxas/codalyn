import { z } from "zod";

import { DEFAULT_IMAGE_EXPORT_FORMAT } from "../image/output-formats.js";
import { BEACON_IMAGE_ERROR_CODES, type BeaconImageErrorCode } from "./beacon-image-errors.js";
import {
  type BeaconPresetRow,
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
 * Default encoded-size cap for presets (migration + invalid-input fallback).
 * ~100 KB keeps exports lean for fast LCP and small transfer sizes.
 */
export const BEACON_PRESET_DEFAULT_MAX_FILE_BYTES = 100 * 1024;

/** Allowed range for `maxFileSizeBytes` on image presets (export UX). */
export const BEACON_PRESET_MAX_FILE_BYTES_MIN = 1024;
export const BEACON_PRESET_MAX_FILE_BYTES_MAX = 50 * 1024 * 1024;

export const beaconImagePresetRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  width: PRESET_EDGE,
  height: PRESET_EDGE,
  /** When omitted, app default export format applies. */
  exportFormat: WEBP_AVIF.optional(),
  /** Export must not exceed this encoded size when the preset is active (bytes). */
  maxFileSizeBytes: z.number().int().min(BEACON_PRESET_MAX_FILE_BYTES_MIN).max(BEACON_PRESET_MAX_FILE_BYTES_MAX),
});

export type BeaconImagePresetRow = z.infer<typeof beaconImagePresetRowSchema>;

const beaconPresetTargetKeySchema = z.custom<BeaconPresetRow["targetKey"]>(isPresetTargetKey);

export const beaconPresetRowV2Schema = beaconImagePresetRowSchema.extend({
  targetKey: beaconPresetTargetKeySchema,
});

export type BeaconPresetRowV2 = z.infer<typeof beaconPresetRowV2Schema>;

export const beaconPresetStorageV2Schema = z.object({
  siteDefault: beaconPresetRowV2Schema.nullable(),
  byTargetKey: z.record(z.string(), beaconPresetRowV2Schema),
});

export type BeaconPresetStorageV2 = {
  siteDefault: BeaconPresetRowV2 | null;
  byTargetKey: Record<PresetTargetKeyString, BeaconPresetRowV2>;
};

export type BeaconPresetStorageValidationResult =
  | { ok: true; value: BeaconPresetStorageV2 }
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
  imagePresets: z.array(beaconImagePresetRowSchema),
  imagePresetStorageV2: beaconPresetStorageV2Schema.default({
    siteDefault: null,
    byTargetKey: {},
  }),
  /**
   * Workspace-level export presets visible only to designers (and admins), not to editors.
   * Stored with team settings; cleared in API responses for editor experience.
   */
  designerOnlyImagePresets: z.array(beaconImagePresetRowSchema).default([]),
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

function normalizeBeaconPresetStorageV2Internal(input: BeaconPresetStorageV2): BeaconPresetStorageValidationResult {
  const byTargetKey: Record<PresetTargetKeyString, BeaconPresetRowV2> = {};
  const seen = new Set<string>();

  const addRow = (row: BeaconPresetRowV2, includeInByTargetKey: boolean): BeaconPresetStorageValidationResult => {
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
    const siteDefaultResult = addRow(input.siteDefault, false);
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
    value: {
      siteDefault: input.siteDefault,
      byTargetKey,
    },
  };
}

export function normalizeBeaconPresetStorageV2(raw: unknown): BeaconPresetStorageValidationResult {
  const parsed = beaconPresetStorageV2Schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errorCode: BEACON_IMAGE_ERROR_CODES.PRESET_TARGET_KEY_INVALID,
    };
  }
  return normalizeBeaconPresetStorageV2Internal(parsed.data as BeaconPresetStorageV2);
}

export function validateBeaconPresetStorageV2Patch(raw: unknown):
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
  if (!Object.keys(record).includes("imagePresetStorageV2")) {
    return { ok: true, normalizedPatch: raw };
  }
  if (record.imagePresetStorageV2 === undefined) {
    return { ok: true, normalizedPatch: raw };
  }
  const normalized = normalizeBeaconPresetStorageV2(record.imagePresetStorageV2);
  if (!normalized.ok) {
    return { ok: false, errorCode: normalized.errorCode };
  }
  return {
    ok: true,
    normalizedPatch: {
      ...record,
      imagePresetStorageV2: normalized.value,
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
    imagePresets: [],
    imagePresetStorageV2: {
      siteDefault: null,
      byTargetKey: {},
    },
    designerOnlyImagePresets: [],
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

/** Export strip: workspace presets plus designer-only rows when present. */
export function getBeaconExportImagePresets(settings: BeaconAppSettings): BeaconImagePresetRow[] {
  return [...settings.imagePresets, ...settings.designerOnlyImagePresets];
}

function migrateImagePresetRow(row: unknown): unknown {
  if (row === null || typeof row !== "object" || Array.isArray(row)) {
    return row;
  }
  const o = row as Record<string, unknown>;
  const { exportQuality: _legacyQuality, ...rest } = o;
  const rawMax = rest.maxFileSizeBytes;
  if (typeof rawMax === "number" && Number.isFinite(rawMax)) {
    const clamped = Math.min(
      BEACON_PRESET_MAX_FILE_BYTES_MAX,
      Math.max(BEACON_PRESET_MAX_FILE_BYTES_MIN, Math.round(rawMax))
    );
    return { ...rest, maxFileSizeBytes: clamped };
  }
  return { ...rest, maxFileSizeBytes: BEACON_PRESET_DEFAULT_MAX_FILE_BYTES };
}

function migrateImagePresetsField(raw: unknown): unknown {
  if (!Array.isArray(raw)) {
    return raw;
  }
  return raw.map(migrateImagePresetRow);
}

export function parseBeaconAppSettings(raw: unknown): BeaconAppSettings {
  let normalizedV2: BeaconPresetStorageV2 = {
    siteDefault: null,
    byTargetKey: {},
  };
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    const maybeV2 = (raw as Record<string, unknown>).imagePresetStorageV2;
    if (maybeV2 !== undefined) {
      const normalized = normalizeBeaconPresetStorageV2(maybeV2);
      if (normalized.ok) {
        normalizedV2 = normalized.value;
      }
    }
  }
  const prepped =
    raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? {
          ...(raw as Record<string, unknown>),
          imagePresets: migrateImagePresetsField((raw as Record<string, unknown>).imagePresets),
          imagePresetStorageV2: normalizedV2,
          designerOnlyImagePresets: migrateImagePresetsField((raw as Record<string, unknown>).designerOnlyImagePresets),
        }
      : raw;
  const parsed = beaconAppSettingsSchema.safeParse(prepped);
  if (parsed.success) {
    return parsed.data;
  }
  return getDefaultBeaconAppSettings();
}

/** True when a persisted v1 payload predates image preset rows and should be merged with defaults (or re-saved). */
export function beaconStoredSettingsNeedsImagePresetMigration(raw: unknown): boolean {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return false;
  }
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) {
    return false;
  }
  return !Array.isArray(o.imagePresets);
}

/** Deep-enough merge for persisted JSON: `patch` wins per-field; arrays replaced when provided. */
export function mergeBeaconAppSettings(base: BeaconAppSettings, patch: Partial<BeaconAppSettings>): BeaconAppSettings {
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  ) as Partial<BeaconAppSettings>;
  return beaconAppSettingsSchema.parse({
    ...base,
    ...clean,
    imagePresets: clean.imagePresets ?? base.imagePresets,
    imagePresetStorageV2: clean.imagePresetStorageV2 ?? base.imagePresetStorageV2,
    designerOnlyImagePresets: clean.designerOnlyImagePresets ?? base.designerOnlyImagePresets,
    cmsLayout: clean.cmsLayout ?? base.cmsLayout,
  });
}

export function parseBeaconAppSettingsPartial(raw: unknown): Partial<BeaconAppSettings> {
  const normalizedPatch = validateBeaconPresetStorageV2Patch(raw);
  if (!normalizedPatch.ok) {
    return {};
  }
  const parsed = beaconAppSettingsSchema.partial().safeParse(normalizedPatch.normalizedPatch);
  if (parsed.success) {
    return parsed.data;
  }
  return {};
}
