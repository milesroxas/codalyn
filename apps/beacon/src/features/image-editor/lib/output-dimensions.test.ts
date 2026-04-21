import { describe, expect, it } from "vitest";

import { clampEdge, outputDimensionsMatchingCrop, parseOutputDimension } from "./apply-cropped-export";

describe("clampEdge", () => {
  it("clamps to MIN_EDGE through MAX_EDGE and rounds", () => {
    expect(clampEdge(0.4)).toBe(1);
    expect(clampEdge(Number.NaN)).toBe(1);
    expect(clampEdge(9000)).toBe(8192);
  });
});

describe("parseOutputDimension", () => {
  it("uses fallback for blank or invalid input", () => {
    expect(parseOutputDimension("", 400)).toBe(400);
    expect(parseOutputDimension("  ", 400)).toBe(400);
    expect(parseOutputDimension("x", 200)).toBe(200);
  });

  it("clamps parsed numbers", () => {
    expect(parseOutputDimension("100", 1)).toBe(100);
    expect(parseOutputDimension("999999", 1)).toBe(8192);
  });
});

describe("outputDimensionsMatchingCrop", () => {
  const crop = { x: 0, y: 0, width: 1600, height: 900, unit: "px" as const };

  it("for landscape crop, long edge follows width input", () => {
    const { width, height } = outputDimensionsMatchingCrop(crop, 1920, 1080);
    expect(width).toBe(1920);
    expect(height).toBe(1080);
  });

  it("falls back to clamped inputs when aspect is invalid", () => {
    const bad = { ...crop, width: 0, height: 100 };
    const out = outputDimensionsMatchingCrop(bad, 500, 400);
    expect(out.width).toBe(500);
    expect(out.height).toBe(400);
  });
});
