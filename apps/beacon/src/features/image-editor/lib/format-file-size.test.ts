import { describe, expect, it } from "vitest";

import { formatFileSize, formatSizeDeltaPercent } from "./format-file-size";

describe("formatFileSize", () => {
  it("returns em dash for non-finite or negative values", () => {
    expect(formatFileSize(Number.NaN)).toBe("—");
    expect(formatFileSize(-1)).toBe("—");
    expect(formatFileSize(Number.POSITIVE_INFINITY)).toBe("—");
  });

  it("formats bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("formats kilobytes with one decimal when under 10 KB", () => {
    expect(formatFileSize(5 * 1024)).toBe("5.0 KB");
  });

  it("formats megabytes with two decimals", () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.00 MB");
  });
});

describe("formatSizeDeltaPercent", () => {
  it("returns empty when original is invalid", () => {
    expect(formatSizeDeltaPercent(0, 100)).toBe("");
    expect(formatSizeDeltaPercent(-1, 100)).toBe("");
  });

  it("returns empty when output is not finite", () => {
    expect(formatSizeDeltaPercent(100, Number.NaN)).toBe("");
  });

  it("describes near-parity", () => {
    expect(formatSizeDeltaPercent(1000, 1000)).toContain("same size");
  });

  it("describes smaller output", () => {
    expect(formatSizeDeltaPercent(1000, 500)).toContain("smaller");
  });

  it("describes larger output", () => {
    expect(formatSizeDeltaPercent(1000, 1500)).toContain("larger");
  });
});
