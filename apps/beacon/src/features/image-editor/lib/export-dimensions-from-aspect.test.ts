import { describe, expect, it } from "vitest";

import { dimensionsFromMaxWidthAndAspect } from "./export-dimensions-from-aspect";

describe("dimensionsFromMaxWidthAndAspect", () => {
  it("derives height from max width and aspect", () => {
    const { width, height } = dimensionsFromMaxWidthAndAspect(1200, 16 / 9);
    expect(width).toBe(1200);
    expect(height).toBe(675);
  });

  it("handles portrait ratio", () => {
    const { width, height } = dimensionsFromMaxWidthAndAspect(900, 9 / 16);
    expect(width).toBe(900);
    expect(height).toBe(1600);
  });
});
