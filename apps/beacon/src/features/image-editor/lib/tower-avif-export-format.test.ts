import { describe, expect, it } from "vitest";

import { isAvifPresetOverriddenByTowerLimit, resolveEffectiveExportFormat } from "./tower-avif-export-format";

describe("resolveEffectiveExportFormat", () => {
  it("returns webp when avif is requested and the Tower image limit is reached", () => {
    expect(resolveEffectiveExportFormat("avif", true)).toBe("webp");
  });

  it("keeps avif when the Tower image limit is not reached", () => {
    expect(resolveEffectiveExportFormat("avif", false)).toBe("avif");
  });

  it("keeps webp regardless of limit state", () => {
    expect(resolveEffectiveExportFormat("webp", true)).toBe("webp");
    expect(resolveEffectiveExportFormat("webp", false)).toBe("webp");
  });
});

describe("isAvifPresetOverriddenByTowerLimit", () => {
  it("is true for avif presets when the limit is reached", () => {
    expect(isAvifPresetOverriddenByTowerLimit({ imageOptimizeLimitReached: true, presetExportFormat: "avif" })).toBe(
      true
    );
  });

  it("is false for webp presets or when the limit is not reached", () => {
    expect(isAvifPresetOverriddenByTowerLimit({ imageOptimizeLimitReached: true, presetExportFormat: "webp" })).toBe(
      false
    );
    expect(isAvifPresetOverriddenByTowerLimit({ imageOptimizeLimitReached: false, presetExportFormat: "avif" })).toBe(
      false
    );
  });
});
