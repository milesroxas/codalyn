import { describe, expect, it } from "vitest";
import { parseImageFormatParam } from "./optimize-image";

describe("parseImageFormatParam", () => {
  it("defaults to webp", () => {
    expect(parseImageFormatParam(null)).toBe("webp");
    expect(parseImageFormatParam("")).toBe("webp");
    expect(parseImageFormatParam("png")).toBe("webp");
  });

  it("accepts avif", () => {
    expect(parseImageFormatParam("avif")).toBe("avif");
  });
});
