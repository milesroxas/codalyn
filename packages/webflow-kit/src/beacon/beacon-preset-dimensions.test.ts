import { describe, expect, it } from "vitest";

import {
  draftToMaxBytes,
  formatBeaconPresetDimensionsLabel,
  formatBeaconPresetExportSummary,
  formatBeaconPresetMax,
  formatBeaconPresetStorageSummary,
  isMaxSizeUnit,
  MAX_SIZE_UNIT_OPTIONS,
  maxBytesToDraft,
  parsePresetOutputDimension,
} from "./beacon-preset-dimensions.js";

describe("parsePresetOutputDimension", () => {
  it("uses fallback for empty or invalid input", () => {
    expect(parsePresetOutputDimension("", 400)).toBe(400);
    expect(parsePresetOutputDimension("x", 200)).toBe(200);
  });

  it("clamps valid numeric input", () => {
    expect(parsePresetOutputDimension("100", 1)).toBe(100);
    expect(parsePresetOutputDimension("999999", 1)).toBe(8192);
  });
});

describe("isMaxSizeUnit", () => {
  it("accepts kb and mb only", () => {
    expect(isMaxSizeUnit("kb")).toBe(true);
    expect(isMaxSizeUnit("mb")).toBe(true);
    expect(isMaxSizeUnit("gb")).toBe(false);
  });

  it("lists max size unit options", () => {
    expect(MAX_SIZE_UNIT_OPTIONS.map((option) => option.value)).toEqual(["kb", "mb"]);
  });
});

describe("max size draft helpers", () => {
  it("round-trips common byte values", () => {
    expect(draftToMaxBytes("100", "kb")).toBe(102_400);
    expect(maxBytesToDraft(102_400)).toEqual({ value: "100", unit: "kb" });
  });

  it("formats max file size labels", () => {
    expect(formatBeaconPresetMax(102_400)).toBe("100 KB");
    expect(formatBeaconPresetMax(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});

describe("preset display formatters", () => {
  const row = {
    width: 800,
    height: 600,
    exportFormat: "webp" as const,
    maxFileSizeBytes: 102_400,
  };

  it("formats dimensions consistently", () => {
    expect(formatBeaconPresetDimensionsLabel(row)).toBe("800×600px");
  });

  it("formats export summary with explicit format", () => {
    expect(formatBeaconPresetExportSummary(row)).toBe("800×600px · webp");
  });

  it("falls back to default export format in summary", () => {
    expect(formatBeaconPresetExportSummary({ width: 1200, height: 800 }, "avif")).toBe("1200×800px · avif");
  });

  it("formats full storage summary", () => {
    expect(formatBeaconPresetStorageSummary(row)).toBe("800×600px · webp · max 100 KB");
  });
});
