import { describe, expect, it } from "vitest";

import {
  getDefaultFlintAppSettings,
  mergeFlintAppSettings,
  parseFlintAppSettings,
  parseFlintAppSettingsPartial,
} from "./flint-app-settings.js";

describe("flint-app-settings", () => {
  it("parses a canonical full payload", () => {
    const raw = {
      version: 1,
      theme: "dark",
      autoSelectElement: false,
      ignoreThirdPartyClasses: false,
      windowPreset: "large",
      globalIgnoredClasses: ["swiper-slide"],
      presetIgnoredClasses: { lumos: ["temp_thing"] },
      activePresetId: "client-first",
      lastUpdated: "2026-06-14T00:00:00.000Z",
    };
    expect(parseFlintAppSettings(raw)).toEqual(raw);
  });

  it("fills defaults for a minimal payload (version only)", () => {
    expect(parseFlintAppSettings({ version: 1 })).toEqual(getDefaultFlintAppSettings());
  });

  it("returns defaults on malformed shape (wrong types, bad enum)", () => {
    expect(parseFlintAppSettings({ version: 2 })).toEqual(getDefaultFlintAppSettings());
    expect(parseFlintAppSettings({ version: 1, theme: "neon" })).toEqual(getDefaultFlintAppSettings());
    expect(parseFlintAppSettings({ version: 1, windowPreset: "huge" })).toEqual(getDefaultFlintAppSettings());
    expect(parseFlintAppSettings(null)).toEqual(getDefaultFlintAppSettings());
    expect(parseFlintAppSettings("nope")).toEqual(getDefaultFlintAppSettings());
  });

  it("drops empty-string ignore entries via min(1) on each item", () => {
    expect(parseFlintAppSettings({ version: 1, globalIgnoredClasses: [""] })).toEqual(getDefaultFlintAppSettings());
  });

  it("treats activePresetId null as a valid value", () => {
    const parsed = parseFlintAppSettings({ version: 1, activePresetId: null });
    expect(parsed.activePresetId).toBeNull();
  });

  describe("partial parse", () => {
    it("keeps only valid known fields", () => {
      const patch = parseFlintAppSettingsPartial({ theme: "light", bogus: true });
      expect(patch).toEqual({ theme: "light" });
    });

    it("returns empty object for malformed partial", () => {
      expect(parseFlintAppSettingsPartial({ theme: 123 })).toEqual({});
    });
  });

  describe("merge", () => {
    it("patch wins per-field; undefined ignored", () => {
      const base = getDefaultFlintAppSettings();
      const merged = mergeFlintAppSettings(base, { theme: "dark", autoSelectElement: undefined });
      expect(merged.theme).toBe("dark");
      expect(merged.autoSelectElement).toBe(true);
    });

    it("replaces arrays/records when provided", () => {
      const base = { ...getDefaultFlintAppSettings(), globalIgnoredClasses: ["a"] };
      const merged = mergeFlintAppSettings(base, { globalIgnoredClasses: ["b"] });
      expect(merged.globalIgnoredClasses).toEqual(["b"]);
    });
  });
});
