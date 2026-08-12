import { describe, expect, it } from "vitest";

import {
  BEACON_QUALITY_PARENT_SOURCE,
  BEACON_QUALITY_POPOUT_SOURCE,
  clampExportQuality,
  isQualityParentToPopoutMessage,
  isQualityPopoutMessage,
} from "@/features/image-editor/lib/quality-popout-protocol";

describe("isQualityPopoutMessage", () => {
  it("accepts preview-quality-changed with numeric quality", () => {
    expect(
      isQualityPopoutMessage({
        source: BEACON_QUALITY_POPOUT_SOURCE,
        type: "preview-quality-changed",
        quality: 0.72,
      })
    ).toBe(true);
  });

  it("accepts save-and-close with numeric quality", () => {
    expect(
      isQualityPopoutMessage({
        source: BEACON_QUALITY_POPOUT_SOURCE,
        type: "save-and-close",
        quality: 1,
      })
    ).toBe(true);
  });

  it("rejects wrong source", () => {
    expect(
      isQualityPopoutMessage({
        source: "other",
        type: "preview-quality-changed",
        quality: 0.5,
      })
    ).toBe(false);
  });

  it("rejects non-object data", () => {
    expect(isQualityPopoutMessage(null)).toBe(false);
    expect(isQualityPopoutMessage(undefined)).toBe(false);
    expect(isQualityPopoutMessage("x")).toBe(false);
  });

  it("rejects unknown type", () => {
    expect(
      isQualityPopoutMessage({
        source: BEACON_QUALITY_POPOUT_SOURCE,
        type: "other",
        quality: 0.5,
      })
    ).toBe(false);
  });

  it("rejects non-numeric quality", () => {
    expect(
      isQualityPopoutMessage({
        source: BEACON_QUALITY_POPOUT_SOURCE,
        type: "preview-quality-changed",
        quality: "0.5",
      })
    ).toBe(false);
  });
});

describe("isQualityParentToPopoutMessage", () => {
  const blob = new Blob(["x"], { type: "image/jpeg" });

  it("accepts a canonical init message", () => {
    expect(
      isQualityParentToPopoutMessage({
        source: BEACON_QUALITY_PARENT_SOURCE,
        type: "init",
        originalBlob: blob,
        compressedBlob: blob,
        aspectRatio: 1.5,
        initialQuality: 0.8,
      })
    ).toBe(true);
  });

  it("accepts compressed-updated with a Blob and compressed-error", () => {
    expect(
      isQualityParentToPopoutMessage({
        source: BEACON_QUALITY_PARENT_SOURCE,
        type: "compressed-updated",
        compressedBlob: blob,
      })
    ).toBe(true);
    expect(
      isQualityParentToPopoutMessage({
        source: BEACON_QUALITY_PARENT_SOURCE,
        type: "compressed-error",
      })
    ).toBe(true);
  });

  it("rejects init with missing or non-Blob images", () => {
    expect(
      isQualityParentToPopoutMessage({
        source: BEACON_QUALITY_PARENT_SOURCE,
        type: "init",
        originalBlob: "blob:...",
        compressedBlob: blob,
        aspectRatio: 1,
        initialQuality: 0.8,
      })
    ).toBe(false);
    expect(
      isQualityParentToPopoutMessage({
        source: BEACON_QUALITY_PARENT_SOURCE,
        type: "init",
        compressedBlob: blob,
        aspectRatio: 1,
        initialQuality: 0.8,
      })
    ).toBe(false);
  });

  it("rejects init with non-numeric aspectRatio or initialQuality", () => {
    expect(
      isQualityParentToPopoutMessage({
        source: BEACON_QUALITY_PARENT_SOURCE,
        type: "init",
        originalBlob: blob,
        compressedBlob: blob,
        aspectRatio: "1.5",
        initialQuality: 0.8,
      })
    ).toBe(false);
  });

  it("rejects wrong source, unknown type, and non-object data", () => {
    expect(
      isQualityParentToPopoutMessage({
        source: BEACON_QUALITY_POPOUT_SOURCE,
        type: "compressed-error",
      })
    ).toBe(false);
    expect(isQualityParentToPopoutMessage({ source: BEACON_QUALITY_PARENT_SOURCE, type: "other" })).toBe(false);
    expect(isQualityParentToPopoutMessage(null)).toBe(false);
    expect(isQualityParentToPopoutMessage("init")).toBe(false);
  });

  it("rejects compressed-updated without a Blob", () => {
    expect(
      isQualityParentToPopoutMessage({
        source: BEACON_QUALITY_PARENT_SOURCE,
        type: "compressed-updated",
        compressedBlob: { size: 3 },
      })
    ).toBe(false);
  });
});

describe("clampExportQuality", () => {
  it("clamps to the 0.05–1 range", () => {
    expect(clampExportQuality(0.5)).toBe(0.5);
    expect(clampExportQuality(0)).toBe(0.05);
    expect(clampExportQuality(-2)).toBe(0.05);
    expect(clampExportQuality(3)).toBe(1);
  });

  it("accepts numeric strings and falls back to 0.8 for non-finite input", () => {
    expect(clampExportQuality("0.72")).toBe(0.72);
    expect(clampExportQuality(Number.NaN)).toBe(0.8);
    expect(clampExportQuality(undefined)).toBe(0.8);
    expect(clampExportQuality("junk")).toBe(0.8);
  });
});
