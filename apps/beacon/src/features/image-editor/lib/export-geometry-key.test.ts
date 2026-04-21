import { describe, expect, it } from "vitest";

import { getExportGeometryKey } from "./export-geometry-key";

describe("getExportGeometryKey", () => {
  it("concatenates source, crop box, and dimensions", () => {
    expect(getExportGeometryKey("blob:abc", { x: 1, y: 2, width: 100, height: 50 }, 800, 600)).toBe(
      "blob:abc|1,2,100,50|800|600"
    );
  });

  it("uses empty crop segment when crop is null", () => {
    expect(getExportGeometryKey("x", null, 1, 1)).toBe("x||1|1");
  });

  it("uses empty string for null image src", () => {
    expect(getExportGeometryKey(null, null, 10, 10)).toBe("||10|10");
  });
});
