import { describe, expect, it } from "vitest";

import {
  isAvifPresetAwaitingConsent,
  isAvifPresetOverriddenByTowerLimit,
  resolveEffectiveExportFormat,
} from "./tower-avif-export-format";

const CONSENTED = { imageOptimizeLimitReached: false, avifTowerConsentGranted: true };

describe("resolveEffectiveExportFormat", () => {
  it("returns webp when avif is requested and the Tower image limit is reached", () => {
    expect(
      resolveEffectiveExportFormat("avif", { imageOptimizeLimitReached: true, avifTowerConsentGranted: true })
    ).toBe("webp");
  });

  it("returns webp when avif is requested without the explicit Tower opt-in", () => {
    expect(
      resolveEffectiveExportFormat("avif", { imageOptimizeLimitReached: false, avifTowerConsentGranted: false })
    ).toBe("webp");
  });

  it("keeps avif only when consented and under the limit", () => {
    expect(resolveEffectiveExportFormat("avif", CONSENTED)).toBe("avif");
  });

  it("keeps webp regardless of limit or consent state", () => {
    expect(
      resolveEffectiveExportFormat("webp", { imageOptimizeLimitReached: true, avifTowerConsentGranted: false })
    ).toBe("webp");
    expect(resolveEffectiveExportFormat("webp", CONSENTED)).toBe("webp");
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

describe("isAvifPresetAwaitingConsent", () => {
  it("is true for avif presets without the Tower opt-in", () => {
    expect(isAvifPresetAwaitingConsent({ avifTowerConsentGranted: false, presetExportFormat: "avif" })).toBe(true);
  });

  it("is false once consent is granted or for non-avif presets", () => {
    expect(isAvifPresetAwaitingConsent({ avifTowerConsentGranted: true, presetExportFormat: "avif" })).toBe(false);
    expect(isAvifPresetAwaitingConsent({ avifTowerConsentGranted: false, presetExportFormat: "webp" })).toBe(false);
    expect(isAvifPresetAwaitingConsent({ avifTowerConsentGranted: false, presetExportFormat: null })).toBe(false);
    expect(isAvifPresetAwaitingConsent({ avifTowerConsentGranted: false, presetExportFormat: undefined })).toBe(false);
  });
});
