import { describe, expect, it } from "vitest";
import {
  DEFAULT_IMAGE_EXPORT_FORMAT,
  fileExtensionForFormat,
  isImageExportFormat,
  mimeTypeForFormat,
} from "./output-formats.js";

describe("output-formats", () => {
  it("defaults to webp", () => {
    expect(DEFAULT_IMAGE_EXPORT_FORMAT).toBe("webp");
  });

  it("narrows format strings", () => {
    expect(isImageExportFormat("webp")).toBe(true);
    expect(isImageExportFormat("avif")).toBe(true);
    expect(isImageExportFormat("png")).toBe(false);
  });

  it("maps mime and extension", () => {
    expect(mimeTypeForFormat("webp")).toBe("image/webp");
    expect(mimeTypeForFormat("avif")).toBe("image/avif");
    expect(fileExtensionForFormat("webp")).toBe("webp");
    expect(fileExtensionForFormat("avif")).toBe("avif");
  });
});
