import { describe, expect, it } from "vitest";

import { parseAspectRatioFromMergedStyle, parseAspectRatioFromStyleValue } from "./webflow-style-value-parsers";

describe("parseAspectRatioFromStyleValue", () => {
  it("parses a number", () => {
    expect(parseAspectRatioFromStyleValue(1.5)).toBeCloseTo(1.5);
  });
  it("parses W / H", () => {
    expect(parseAspectRatioFromStyleValue("16 / 9")).toBeCloseTo(16 / 9);
  });
  it("parses W : H (e.g. Square 1:1 in Designer)", () => {
    expect(parseAspectRatioFromStyleValue("1:1")).toBeCloseTo(1);
  });
  it("returns undefined for auto", () => {
    expect(parseAspectRatioFromStyleValue("auto")).toBeUndefined();
  });
  it("parses a numerator/denominator object", () => {
    expect(parseAspectRatioFromStyleValue({ numerator: 4, denominator: 3 })).toBeCloseTo(4 / 3);
  });
  it("returns undefined for non-positive values", () => {
    expect(parseAspectRatioFromStyleValue(0)).toBeUndefined();
    expect(parseAspectRatioFromStyleValue(-1)).toBeUndefined();
  });
});

describe("parseAspectRatioFromMergedStyle", () => {
  it("reads the kebab-case key", () => {
    expect(parseAspectRatioFromMergedStyle({ "aspect-ratio": "1 / 1" })).toBeCloseTo(1);
  });
  it("falls back to the camelCase key", () => {
    expect(parseAspectRatioFromMergedStyle({ aspectRatio: "4 / 3" })).toBeCloseTo(4 / 3);
  });
  it("returns undefined when no aspect is present", () => {
    expect(parseAspectRatioFromMergedStyle({ width: "100%" })).toBeUndefined();
  });
  it("returns undefined when the value is auto", () => {
    expect(parseAspectRatioFromMergedStyle({ "aspect-ratio": "auto" })).toBeUndefined();
  });
});
