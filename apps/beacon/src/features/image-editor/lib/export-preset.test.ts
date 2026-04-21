import type { BeaconImagePresetRow, ImageExportFormat } from "@codalyn/webflow-kit";
import { describe, expect, it } from "vitest";

import {
  type ExportPresetDefaults,
  exportPresetMatchesSession,
  findMatchingExportPresetId,
  resolvePresetExportFormat,
} from "./export-preset";

function preset(partial: Partial<BeaconImagePresetRow> & Pick<BeaconImagePresetRow, "id">): BeaconImagePresetRow {
  return {
    name: "P",
    width: 800,
    height: 600,
    maxFileSizeBytes: 500_000,
    ...partial,
  };
}

const defaults: ExportPresetDefaults = {
  exportFormat: "webp",
  exportQuality: 0.8,
};

describe("resolvePresetExportFormat", () => {
  it("uses preset exportFormat when set", () => {
    expect(resolvePresetExportFormat(preset({ id: "a", exportFormat: "avif" }), defaults)).toBe("avif");
  });

  it("falls back to defaults when preset omits exportFormat", () => {
    expect(resolvePresetExportFormat(preset({ id: "a" }), defaults)).toBe("webp");
  });
});

describe("exportPresetMatchesSession", () => {
  it("matches when dimensions and normalized format align", () => {
    const row = preset({ id: "x", width: 1200, height: 800, exportFormat: "webp" });
    expect(exportPresetMatchesSession(row, defaults, 1200, 800, "webp")).toBe(true);
  });

  it("uses normalizeFormat for comparison", () => {
    const row = preset({ id: "x", exportFormat: "webp" });
    const upper = (f: ImageExportFormat) => f.toUpperCase() as ImageExportFormat;
    expect(exportPresetMatchesSession(row, defaults, 800, 600, "webp", upper)).toBe(true);
  });

  it("returns false when width differs", () => {
    const row = preset({ id: "x", width: 800, height: 600 });
    expect(exportPresetMatchesSession(row, defaults, 801, 600, "webp")).toBe(false);
  });
});

describe("findMatchingExportPresetId", () => {
  const presets = [
    preset({ id: "first", width: 100, height: 100 }),
    preset({ id: "second", width: 200, height: 200, exportFormat: "avif" }),
  ];

  it("returns first matching preset id", () => {
    expect(findMatchingExportPresetId(presets, defaults, 200, 200, "avif")).toBe("second");
  });

  it("returns null when no preset matches", () => {
    expect(findMatchingExportPresetId(presets, defaults, 999, 999, "webp")).toBe(null);
  });
});
