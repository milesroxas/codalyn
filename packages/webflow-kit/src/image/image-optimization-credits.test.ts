import { describe, expect, it } from "vitest";
import {
  calculateImageOptimizationCredits,
  IMAGE_OPTIMIZATION_MAX_CREDITS,
  IMAGE_OPTIMIZATION_MIN_CREDITS,
} from "./image-optimization-credits.js";

describe("calculateImageOptimizationCredits", () => {
  it("charges one credit for small AVIF exports (≤1MP)", () => {
    expect(calculateImageOptimizationCredits({ outputWidth: 800, outputHeight: 600, format: "avif" })).toBe(1);
    expect(calculateImageOptimizationCredits({ outputWidth: 1280, outputHeight: 720, format: "avif" })).toBe(1);
  });

  it("scales up for medium AVIF exports (~1-2MP)", () => {
    expect(calculateImageOptimizationCredits({ outputWidth: 1600, outputHeight: 900, format: "avif" })).toBe(2);
  });

  it("scales further for larger AVIF exports (~2-4MP)", () => {
    expect(calculateImageOptimizationCredits({ outputWidth: 1920, outputHeight: 1080, format: "avif" })).toBe(3);
    expect(calculateImageOptimizationCredits({ outputWidth: 2560, outputHeight: 1440, format: "avif" })).toBe(5);
  });

  it("charges the maximum for near-max square 2560-edge exports", () => {
    expect(calculateImageOptimizationCredits({ outputWidth: 2560, outputHeight: 2560, format: "avif" })).toBe(
      IMAGE_OPTIMIZATION_MAX_CREDITS
    );
  });

  it("never exceeds the maximum for oversized inputs", () => {
    expect(calculateImageOptimizationCredits({ outputWidth: 8192, outputHeight: 8192, format: "avif" })).toBe(
      IMAGE_OPTIMIZATION_MAX_CREDITS
    );
  });

  it("charges roughly half for WebP at the same resolution", () => {
    expect(calculateImageOptimizationCredits({ outputWidth: 1920, outputHeight: 1080, format: "webp" })).toBe(2);
    expect(calculateImageOptimizationCredits({ outputWidth: 800, outputHeight: 600, format: "webp" })).toBe(
      IMAGE_OPTIMIZATION_MIN_CREDITS
    );
  });

  it("applies a source-byte floor so heavy decodes never undercharge", () => {
    expect(
      calculateImageOptimizationCredits({
        outputWidth: 100,
        outputHeight: 100,
        format: "avif",
        inputBytes: 30 * 1024 * 1024,
      })
    ).toBe(6);
  });

  it("fails safe to the maximum for invalid output dimensions", () => {
    expect(calculateImageOptimizationCredits({ outputWidth: 0, outputHeight: 1080, format: "avif" })).toBe(
      IMAGE_OPTIMIZATION_MAX_CREDITS
    );
    expect(calculateImageOptimizationCredits({ outputWidth: Number.NaN, outputHeight: 1080, format: "avif" })).toBe(
      IMAGE_OPTIMIZATION_MAX_CREDITS
    );
    expect(calculateImageOptimizationCredits({ outputWidth: -10, outputHeight: -10, format: "avif" })).toBe(
      IMAGE_OPTIMIZATION_MAX_CREDITS
    );
  });

  it("is deterministic for identical inputs", () => {
    const input = { outputWidth: 2000, outputHeight: 1500, format: "avif" } as const;
    expect(calculateImageOptimizationCredits(input)).toBe(calculateImageOptimizationCredits(input));
  });
});
