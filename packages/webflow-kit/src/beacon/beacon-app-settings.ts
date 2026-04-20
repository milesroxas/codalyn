import { z } from "zod";

import { DEFAULT_IMAGE_EXPORT_FORMAT } from "../image/output-formats.js";

const WEBP_AVIF = z.enum(["webp", "avif"]);

export const beaconAspectPresetSchema = z.enum(["free", "1", "16-9", "4-3", "3-2", "9-16"]);

export type BeaconAspectPreset = z.infer<typeof beaconAspectPresetSchema>;

export const beaconThemePreferenceSchema = z.enum(["light", "dark", "system"]);

export type BeaconThemePreference = z.infer<typeof beaconThemePreferenceSchema>;

export const beaconImagePresetRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  aspectPreset: beaconAspectPresetSchema,
});

export type BeaconImagePresetRow = z.infer<typeof beaconImagePresetRowSchema>;

export const beaconAppSettingsSchema = z.object({
  version: z.literal(1),
  theme: beaconThemePreferenceSchema,
  defaultExportFormat: WEBP_AVIF,
  /** Encoder quality, 0–1 (matches image editor slider). */
  defaultExportQuality: z.number().min(0).max(1),
  defaultAspectPreset: beaconAspectPresetSchema,
  imagePresets: z.array(beaconImagePresetRowSchema),
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
  };
}

export function parseBeaconAppSettings(raw: unknown): BeaconAppSettings {
  const parsed = beaconAppSettingsSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return getDefaultBeaconAppSettings();
}

/** Deep-enough merge for persisted JSON: `patch` wins per-field; arrays replaced when provided. */
export function mergeBeaconAppSettings(
  base: BeaconAppSettings,
  patch: Partial<BeaconAppSettings>
): BeaconAppSettings {
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
