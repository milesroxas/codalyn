import { z } from "zod";

import { DEFAULT_IMAGE_EXPORT_FORMAT } from "../image/output-formats.js";

const WEBP_AVIF = z.enum(["webp", "avif"]);

export const beaconAspectPresetSchema = z.enum(["free", "1", "16-9", "4-3", "3-2", "9-16"]);

export type BeaconAspectPreset = z.infer<typeof beaconAspectPresetSchema>;

export const beaconThemePreferenceSchema = z.enum(["light", "dark", "system"]);

export type BeaconThemePreference = z.infer<typeof beaconThemePreferenceSchema>;

const PRESET_EDGE = z.number().int().min(1).max(8192);

export const beaconImagePresetRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  width: PRESET_EDGE,
  height: PRESET_EDGE,
  /** When omitted, app default export format applies. */
  exportFormat: WEBP_AVIF.optional(),
  /** When omitted, app default export quality applies. */
  exportQuality: z.number().min(0.05).max(1).optional(),
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
  /** Built-in aspects removed from the crop preset strip; empty means all built-ins are shown. */
  hiddenBuiltinAspectPresets: z.array(beaconAspectPresetSchema).default([]),
});

export type BeaconAppSettings = z.infer<typeof beaconAppSettingsSchema>;

export function getDefaultBeaconAppSettings(): BeaconAppSettings {
  return {
    version: 1,
    theme: "light",
    defaultExportFormat: DEFAULT_IMAGE_EXPORT_FORMAT,
    defaultExportQuality: 0.75,
    defaultAspectPreset: "free",
    imagePresets: [],
    hiddenBuiltinAspectPresets: [],
  };
}

export function getVisibleBuiltinAspectPresets(settings: BeaconAppSettings): BeaconAspectPreset[] {
  const hidden = new Set(settings.hiddenBuiltinAspectPresets);
  return BEACON_BUILTIN_ASPECT_PRESETS.filter((p) => !hidden.has(p));
}

export function parseBeaconAppSettings(raw: unknown): BeaconAppSettings {
  const parsed = beaconAppSettingsSchema.safeParse(raw);
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
  });
}

export function parseBeaconAppSettingsPartial(raw: unknown): Partial<BeaconAppSettings> {
  const parsed = beaconAppSettingsSchema.partial().safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return {};
}
