import { describe, expect, it } from "vitest";

import {
  BEACON_QUALITY_POPOUT_SOURCE,
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
