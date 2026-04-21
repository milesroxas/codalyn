import {
  beaconAppSettingsSchema,
  getDefaultBeaconAppSettings,
  parseBeaconAppSettings,
  parseBeaconAppSettingsPartial,
} from "@codalyn/webflow-kit";
import { describe, expect, it } from "vitest";

/**
 * Contract: Tower `GET/PUT /api/v1/beacon/settings` body uses `settings` matching BeaconAppSettings.
 * If Tower changes shape, these tests fail before Beacon ships a broken client.
 */
describe("Tower ↔ Beacon settings JSON contract", () => {
  it("parses a minimal GET response envelope", () => {
    const defaults = getDefaultBeaconAppSettings();
    const envelope = {
      settings: defaults,
      editorExperience: false,
      canManageTeamBeaconSettings: false,
      restrictToEditorExperience: false,
    };
    const parsed = parseBeaconAppSettings((envelope as { settings: unknown }).settings);
    expect(parsed.version).toBe(1);
    expect(parsed.theme).toBe(defaults.theme);
    expect(envelope.editorExperience).toBe(false);
    expect(envelope.canManageTeamBeaconSettings).toBe(false);
    expect(envelope.restrictToEditorExperience).toBe(false);
  });

  it("accepts PUT-style partial patches used by mergeBeaconAppSettings on Tower", () => {
    const patch = { theme: "dark" as const, defaultExportQuality: 0.5 };
    const merged = parseBeaconAppSettingsPartial(patch);
    expect(merged.theme).toBe("dark");
    expect(merged.defaultExportQuality).toBe(0.5);
  });

  it("does not accept invalid preset rows in the schema (parse falls back to defaults)", () => {
    const bad = {
      ...getDefaultBeaconAppSettings(),
      imagePresets: [{ id: "", name: "x", width: 0, height: 100, maxFileSizeBytes: 5000 }],
    };
    expect(beaconAppSettingsSchema.safeParse(bad).success).toBe(false);
    expect(parseBeaconAppSettings(bad)).toEqual(getDefaultBeaconAppSettings());
  });
});
