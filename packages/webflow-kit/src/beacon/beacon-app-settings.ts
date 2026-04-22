import { z } from "zod";

import { DEFAULT_IMAGE_EXPORT_FORMAT } from "../image/output-formats.js";

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

export function getDefaultBeaconAppSettings(): BeaconAppSettings {
  return {
    version: 1,
    theme: "system",
    defaultExportFormat: DEFAULT_IMAGE_EXPORT_FORMAT,
    defaultExportQuality: 0.75,
    defaultAspectPreset: "free",
    imagePresets: [],
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
  const prepped =
    raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? {
          ...(raw as Record<string, unknown>),
          imagePresets: migrateImagePresetsField((raw as Record<string, unknown>).imagePresets),
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
    designerOnlyImagePresets: clean.designerOnlyImagePresets ?? base.designerOnlyImagePresets,
    cmsLayout: clean.cmsLayout ?? base.cmsLayout,
  });
}

export function parseBeaconAppSettingsPartial(raw: unknown): Partial<BeaconAppSettings> {
  const parsed = beaconAppSettingsSchema.partial().safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return {};
}
