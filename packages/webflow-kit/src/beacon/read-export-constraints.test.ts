import { describe, expect, it } from "vitest";

import {
  type ExportConstraints,
  parsePositiveIntegerString,
  readExportConstraints,
  readStringLikeValue,
} from "./beacon-image-preset-domain.js";

const CANONICAL = {
  width: 1200,
  height: 800,
  exportFormat: "webp",
  maxFileSizeBytes: 500_000,
  quality: 0.8,
} as const;

describe("readStringLikeValue", () => {
  it("reads primitive and wrapped strings, stringifies finite numbers", () => {
    expect(readStringLikeValue("2560")).toBe("2560");
    expect(readStringLikeValue({ value: "2560" })).toBe("2560");
    expect(readStringLikeValue({ sourceType: "x", value: "2560" })).toBe("2560");
    expect(readStringLikeValue(2560)).toBe("2560");
  });

  it("rejects empty / non-finite / missing", () => {
    expect(readStringLikeValue("")).toBeNull();
    expect(readStringLikeValue("   ")).toBeNull();
    expect(readStringLikeValue(Number.NaN)).toBeNull();
    expect(readStringLikeValue(null)).toBeNull();
    expect(readStringLikeValue(undefined)).toBeNull();
    expect(readStringLikeValue({})).toBeNull();
  });
});

describe("parsePositiveIntegerString", () => {
  it("accepts positive integers in primitive and wrapped forms", () => {
    expect(parsePositiveIntegerString("2560")).toBe(2560);
    expect(parsePositiveIntegerString(2560)).toBe(2560);
    expect(parsePositiveIntegerString({ value: "2560" })).toBe(2560);
  });

  it("rejects decimals, zero, negatives, junk, empty", () => {
    expect(parsePositiveIntegerString("12.5")).toBeNull();
    expect(parsePositiveIntegerString(12.5)).toBeNull();
    expect(parsePositiveIntegerString("0")).toBeNull();
    expect(parsePositiveIntegerString("-3")).toBeNull();
    expect(parsePositiveIntegerString("abc")).toBeNull();
    expect(parsePositiveIntegerString("")).toBeNull();
  });
});

describe("readExportConstraints", () => {
  it("reads the canonical shape", () => {
    expect(readExportConstraints(CANONICAL)).toEqual<ExportConstraints>({
      width: 1200,
      height: 800,
      exportFormat: "webp",
      maxFileSizeBytes: 500_000,
      quality: 0.8,
    });
  });

  it("reads an alternate wrapped-equivalent shape", () => {
    const wrapped = {
      value: {
        width: { value: "1200" },
        height: { value: "800" },
        exportFormat: { value: "avif" },
        maxFileSizeBytes: { value: "500000" },
        quality: { value: "0.8" },
      },
    };
    expect(readExportConstraints(wrapped)).toEqual<ExportConstraints>({
      width: 1200,
      height: 800,
      exportFormat: "avif",
      maxFileSizeBytes: 500_000,
      quality: 0.8,
    });
  });

  it("returns null when width or height is missing (pair rule)", () => {
    expect(readExportConstraints({ ...CANONICAL, width: undefined })).toBeNull();
    expect(readExportConstraints({ ...CANONICAL, height: undefined })).toBeNull();
  });

  it("treats width-without-height as missing — both required", () => {
    expect(
      readExportConstraints({ width: 1200, exportFormat: "webp", maxFileSizeBytes: null, quality: 0.8 })
    ).toBeNull();
  });

  it("rejects malformed dimensions (decimal, zero, negative, wrong type, empty)", () => {
    expect(readExportConstraints({ ...CANONICAL, width: 12.5 })).toBeNull();
    expect(readExportConstraints({ ...CANONICAL, width: 0 })).toBeNull();
    expect(readExportConstraints({ ...CANONICAL, height: -10 })).toBeNull();
    expect(readExportConstraints({ ...CANONICAL, width: true })).toBeNull();
    expect(readExportConstraints({ ...CANONICAL, height: "" })).toBeNull();
  });

  it("rejects exportFormat not in {webp, avif}", () => {
    expect(readExportConstraints({ ...CANONICAL, exportFormat: "png" })).toBeNull();
    expect(readExportConstraints({ ...CANONICAL, exportFormat: undefined })).toBeNull();
  });

  it("accepts null maxFileSizeBytes and rejects negative / zero", () => {
    expect(readExportConstraints({ ...CANONICAL, maxFileSizeBytes: null })?.maxFileSizeBytes).toBeNull();
    expect(readExportConstraints({ ...CANONICAL, maxFileSizeBytes: undefined })?.maxFileSizeBytes).toBeNull();
    expect(readExportConstraints({ ...CANONICAL, maxFileSizeBytes: -1 })).toBeNull();
    expect(readExportConstraints({ ...CANONICAL, maxFileSizeBytes: 0 })).toBeNull();
  });

  it("uses defaultQuality only when explicitly provided", () => {
    const noQuality = { width: 1200, height: 800, exportFormat: "webp", maxFileSizeBytes: null };
    expect(readExportConstraints(noQuality)).toBeNull();
    expect(readExportConstraints(noQuality, { defaultQuality: 0.75 })?.quality).toBe(0.75);
  });

  it("rejects out-of-range quality with no fallback, falls back when allowed", () => {
    expect(readExportConstraints({ ...CANONICAL, quality: 2 })).toBeNull();
    expect(readExportConstraints({ ...CANONICAL, quality: -0.1 })).toBeNull();
    expect(readExportConstraints({ ...CANONICAL, quality: 2 }, { defaultQuality: 0.75 })?.quality).toBe(0.75);
  });

  it("rejects non-object input", () => {
    expect(readExportConstraints(null)).toBeNull();
    expect(readExportConstraints("nope")).toBeNull();
    expect(readExportConstraints([CANONICAL])).toBeNull();
  });
});
