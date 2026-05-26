import {
  type BeaconAppSettings,
  beaconAppSettingsSchema,
  normalizeBeaconPresetStorage,
  parseBeaconAppSettings,
} from "./beacon-app-settings.js";
import { type BeaconOrgTeamSettings, beaconOrgTeamSettingsSchema } from "./beacon-org-team-settings.js";

const LEGACY_PRESET_KEYS = ["imagePresets", "designerOnlyImagePresets", "imagePresetStorageV2"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isEmptyPresetStorage(value: unknown): boolean {
  if (!isRecord(value)) {
    return true;
  }
  const byTargetKey = value.byTargetKey;
  const hasTargets = isRecord(byTargetKey) && Object.keys(byTargetKey).length > 0;
  return value.siteDefault == null && !hasTargets;
}

function prepLegacyPresetStorageKeys(record: Record<string, unknown>): void {
  if (record.imagePresetStorageV2 !== undefined && isEmptyPresetStorage(record.imagePresetStorage)) {
    record.imagePresetStorage = record.imagePresetStorageV2;
  }
  delete record.imagePresetStorageV2;
  delete record.imagePresets;
  delete record.designerOnlyImagePresets;
}

export function hasLegacyBeaconPresetStorageKeys(raw: unknown): boolean {
  if (!isRecord(raw)) {
    return false;
  }
  return LEGACY_PRESET_KEYS.some((key) => key in raw);
}

export function migrateBeaconAppSettingsPayload(raw: unknown): BeaconAppSettings {
  if (!isRecord(raw)) {
    return parseBeaconAppSettings(raw);
  }
  const record = { ...raw };
  prepLegacyPresetStorageKeys(record);
  return parseBeaconAppSettings(record);
}

export function migrateBeaconOrgTeamSettingsPayload(raw: unknown): BeaconOrgTeamSettings | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (!isRecord(raw)) {
    return null;
  }
  const record = { ...raw };
  prepLegacyPresetStorageKeys(record);
  const parsed = beaconOrgTeamSettingsSchema.safeParse(record);
  if (!parsed.success) {
    return null;
  }
  if (parsed.data.imagePresetStorage === undefined) {
    return parsed.data;
  }
  const normalized = normalizeBeaconPresetStorage(parsed.data.imagePresetStorage);
  if (!normalized.ok) {
    const { imagePresetStorage: _drop, ...rest } = parsed.data;
    void _drop;
    return rest;
  }
  return {
    ...parsed.data,
    imagePresetStorage: normalized.value,
  };
}

export function beaconAppSettingsPayloadNeedsMigration(raw: unknown): boolean {
  if (!isRecord(raw)) {
    return false;
  }
  if (hasLegacyBeaconPresetStorageKeys(raw)) {
    return true;
  }
  const migrated = migrateBeaconAppSettingsPayload(raw);
  const canonical = serializeBeaconAppSettingsPayload(migrated);
  return JSON.stringify(raw) !== JSON.stringify(canonical);
}

export function beaconOrgTeamSettingsPayloadNeedsMigration(raw: unknown): boolean {
  if (raw === null || raw === undefined) {
    return false;
  }
  const migrated = migrateBeaconOrgTeamSettingsPayload(raw);
  return JSON.stringify(raw) !== JSON.stringify(migrated);
}

/** Ensures persisted JSON matches the canonical app-settings schema shape. */
export function serializeBeaconAppSettingsPayload(settings: BeaconAppSettings): BeaconAppSettings {
  return beaconAppSettingsSchema.parse(settings);
}

/** Ensures persisted JSON matches the canonical org team-settings schema shape. */
export function serializeBeaconOrgTeamSettingsPayload(settings: BeaconOrgTeamSettings): BeaconOrgTeamSettings {
  return beaconOrgTeamSettingsSchema.parse(settings);
}
