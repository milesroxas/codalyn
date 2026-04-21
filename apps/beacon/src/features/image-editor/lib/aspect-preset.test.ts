import { describe, expect, it } from "vitest";

import { type AspectPreset, aspectLabels, aspectValue } from "./aspect-preset";

describe("aspectValue", () => {
  it("returns undefined for free aspect", () => {
    expect(aspectValue("free")).toBeUndefined();
  });

  it("returns numeric ratios for fixed presets", () => {
    expect(aspectValue("1")).toBe(1);
    expect(aspectValue("16-9")).toBeCloseTo(16 / 9);
    expect(aspectValue("9-16")).toBeCloseTo(9 / 16);
  });
});

describe("aspectLabels", () => {
  it("has a label for every AspectPreset key", () => {
    const keys: AspectPreset[] = ["free", "1", "16-9", "4-3", "3-2", "9-16"];
    for (const k of keys) {
      expect(aspectLabels[k].length).toBeGreaterThan(0);
    }
  });
});
