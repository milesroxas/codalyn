import { describe, expect, it } from "vitest";
import { optimizeImageBuffer, parseImageFormatParam } from "./optimize-image";

/** 1×1 transparent PNG */
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

describe("parseImageFormatParam", () => {
  it("defaults to webp", () => {
    expect(parseImageFormatParam(null)).toBe("webp");
    expect(parseImageFormatParam("")).toBe("webp");
    expect(parseImageFormatParam("png")).toBe("webp");
  });

  it("accepts avif", () => {
    expect(parseImageFormatParam("avif")).toBe("avif");
  });

  it("accepts avif case-insensitively", () => {
    expect(parseImageFormatParam("AVIF")).toBe("avif");
    expect(parseImageFormatParam(" AvIf ")).toBe("avif");
  });
});

describe("optimizeImageBuffer", () => {
  it("encodes AVIF with image/avif and ftypavif", async () => {
    const { buffer, mimeType } = await optimizeImageBuffer(tinyPng, "avif", 80);
    expect(mimeType).toBe("image/avif");
    expect(buffer.subarray(4, 12).toString("ascii")).toBe("ftypavif");
  });
});
