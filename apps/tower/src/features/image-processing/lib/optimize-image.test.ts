import { describe, expect, it } from "vitest";
import {
  isAllowedSourceImageFormat,
  optimizeImageBuffer,
  parseImageFormatParam,
  readSourceImageMetadata,
} from "./optimize-image";

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

describe("readSourceImageMetadata (input allowlist)", () => {
  it("reads dimensions + format for an allowlisted raster", async () => {
    await expect(readSourceImageMetadata(tinyPng)).resolves.toEqual({ width: 1, height: 1, format: "png" });
  });

  it("returns null (not throw) for a non-image body", async () => {
    await expect(readSourceImageMetadata(Buffer.from("definitely not an image"))).resolves.toBeNull();
    await expect(readSourceImageMetadata(Buffer.alloc(0))).resolves.toBeNull();
  });

  it("refuses SVG input before any decode", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'
    );
    await expect(readSourceImageMetadata(svg)).resolves.toBeNull();
  });

  it("allowlist covers raster containers only", () => {
    for (const ok of ["png", "jpeg", "jpg", "webp", "avif", "gif", "tiff", "heif", "PNG"]) {
      expect(isAllowedSourceImageFormat(ok)).toBe(true);
    }
    for (const bad of ["svg", "pdf", "magick", "raw", "", null, undefined]) {
      expect(isAllowedSourceImageFormat(bad)).toBe(false);
    }
  });
});
