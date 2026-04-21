import type { z } from "zod";

import { type BeaconAppSettings, beaconAppSettingsSchema, mergeBeaconAppSettings } from "./beacon-app-settings.js";

const beaconOrgTeamFieldsSchema = beaconAppSettingsSchema.pick({
  imagePresets: true,
  hiddenBuiltinAspectPresets: true,
  defaultAspectPreset: true,
  defaultExportFormat: true,
  defaultExportQuality: true,
  limitCropZoomToNativeResolution: true,
});

export const beaconOrgTeamSettingsSchema = beaconOrgTeamFieldsSchema.partial();

export type BeaconOrgTeamSettings = z.infer<typeof beaconOrgTeamSettingsSchema>;

export function parseBeaconOrgTeamSettingsPartial(raw: unknown): Partial<BeaconOrgTeamSettings> {
  const parsed = beaconOrgTeamSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

/** Applies organization team fields over user settings when the team has configured them. */
export function mergeOrgTeamSettingsIntoUser(
  user: BeaconAppSettings,
  org: BeaconOrgTeamSettings | null | undefined
): BeaconAppSettings {
  if (!org) {
    return user;
  }
  const patch: Partial<BeaconAppSettings> = {};
  if (org.imagePresets !== undefined) {
    patch.imagePresets = org.imagePresets;
  }
  if (org.hiddenBuiltinAspectPresets !== undefined) {
    patch.hiddenBuiltinAspectPresets = org.hiddenBuiltinAspectPresets;
  }
  if (org.defaultAspectPreset !== undefined) {
    patch.defaultAspectPreset = org.defaultAspectPreset;
  }
  if (org.defaultExportFormat !== undefined) {
    patch.defaultExportFormat = org.defaultExportFormat;
  }
  if (org.defaultExportQuality !== undefined) {
    patch.defaultExportQuality = org.defaultExportQuality;
  }
  if (org.limitCropZoomToNativeResolution !== undefined) {
    patch.limitCropZoomToNativeResolution = org.limitCropZoomToNativeResolution;
  }
  if (Object.keys(patch).length === 0) {
    return user;
  }
  return mergeBeaconAppSettings(user, patch);
}

const PRESET_KEYS = new Set<keyof BeaconAppSettings>([
  "imagePresets",
  "hiddenBuiltinAspectPresets",
  "defaultAspectPreset",
  "defaultExportFormat",
  "defaultExportQuality",
  "limitCropZoomToNativeResolution",
]);

export function splitBeaconSettingsPatch(patch: Partial<BeaconAppSettings>): {
  team: Partial<BeaconOrgTeamSettings>;
  personal: Partial<BeaconAppSettings>;
} {
  const team: Partial<BeaconOrgTeamSettings> = {};
  const personal: Partial<BeaconAppSettings> = {};
  for (const [k, v] of Object.entries(patch)) {
    const key = k as keyof BeaconAppSettings;
    if (v === undefined) {
      continue;
    }
    if (PRESET_KEYS.has(key)) {
      (team as Record<string, unknown>)[k] = v;
    } else {
      (personal as Record<string, unknown>)[k] = v;
    }
  }
  return { team, personal };
}
