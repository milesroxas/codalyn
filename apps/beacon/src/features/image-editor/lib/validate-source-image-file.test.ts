/** @vitest-environment jsdom */
import { BEACON_IMAGE_ERROR_CODES } from "@codalyn/webflow-kit";
import { describe, expect, it, vi } from "vitest";

import { createSourceImageFileValidator } from "./validate-source-image-file";

function makeImageFile(options: { mimeType: string; size?: number; name?: string }): File {
  const { mimeType, size = 1024, name = "image" } = options;
  const content = new Uint8Array(size);
  return new File([content], name, { type: mimeType });
}

describe("createSourceImageFileValidator", () => {
  it("accepts valid JPEG files", async () => {
    const validator = createSourceImageFileValidator({
      decodeImageFile: vi.fn().mockResolvedValue({ width: 1200, height: 800 }),
    });
    const result = await validator.validate({ file: makeImageFile({ mimeType: "image/jpeg", name: "hero.jpg" }) });
    expect(result.ok).toBe(true);
  });

  it("accepts valid PNG files", async () => {
    const validator = createSourceImageFileValidator({
      decodeImageFile: vi.fn().mockResolvedValue({ width: 1200, height: 800 }),
    });
    const result = await validator.validate({ file: makeImageFile({ mimeType: "image/png", name: "hero.png" }) });
    expect(result.ok).toBe(true);
  });

  it("accepts valid WebP files", async () => {
    const validator = createSourceImageFileValidator({
      decodeImageFile: vi.fn().mockResolvedValue({ width: 1200, height: 800 }),
    });
    const result = await validator.validate({ file: makeImageFile({ mimeType: "image/webp", name: "hero.webp" }) });
    expect(result.ok).toBe(true);
  });

  it("accepts valid GIF files", async () => {
    const validator = createSourceImageFileValidator({
      decodeImageFile: vi.fn().mockResolvedValue({ width: 1200, height: 800 }),
    });
    const result = await validator.validate({ file: makeImageFile({ mimeType: "image/gif", name: "hero.gif" }) });
    expect(result.ok).toBe(true);
  });

  it("accepts AVIF when decode succeeds in the runtime", async () => {
    const validator = createSourceImageFileValidator({
      decodeImageFile: vi.fn().mockResolvedValue({ width: 1200, height: 800 }),
    });
    const result = await validator.validate({ file: makeImageFile({ mimeType: "image/avif", name: "hero.avif" }) });
    expect(result.ok).toBe(true);
  });

  it("rejects AVIF when decode fails in the runtime", async () => {
    const validator = createSourceImageFileValidator({
      decodeImageFile: vi.fn().mockRejectedValue(new Error("unsupported")),
    });
    const result = await validator.validate({ file: makeImageFile({ mimeType: "image/avif", name: "hero.avif" }) });
    expect(result).toEqual({
      ok: false,
      errorCode: BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_DECODE_FAILED,
    });
  });

  it("rejects SVG files before decode", async () => {
    const decodeImageFile = vi.fn().mockResolvedValue({ width: 100, height: 100 });
    const validator = createSourceImageFileValidator({ decodeImageFile });
    const result = await validator.validate({ file: makeImageFile({ mimeType: "image/svg+xml", name: "icon.svg" }) });
    expect(result).toEqual({
      ok: false,
      errorCode: BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_SVG_BLOCKED,
    });
    expect(decodeImageFile).not.toHaveBeenCalled();
  });

  it("rejects unsupported MIME types", async () => {
    const decodeImageFile = vi.fn().mockResolvedValue({ width: 100, height: 100 });
    const validator = createSourceImageFileValidator({ decodeImageFile });
    const result = await validator.validate({ file: makeImageFile({ mimeType: "image/tiff", name: "hero.tiff" }) });
    expect(result).toEqual({
      ok: false,
      errorCode: BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_TYPE_NOT_ALLOWED,
    });
    expect(decodeImageFile).not.toHaveBeenCalled();
  });

  it("rejects files over 20 MiB", async () => {
    const decodeImageFile = vi.fn().mockResolvedValue({ width: 100, height: 100 });
    const validator = createSourceImageFileValidator({ decodeImageFile });
    const result = await validator.validate({
      file: makeImageFile({ mimeType: "image/jpeg", size: 20 * 1024 * 1024 + 1, name: "large.jpg" }),
    });
    expect(result).toEqual({
      ok: false,
      errorCode: BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_TOO_LARGE,
    });
    expect(decodeImageFile).not.toHaveBeenCalled();
  });

  it("rejects images over 40 megapixels", async () => {
    const validator = createSourceImageFileValidator({
      decodeImageFile: vi.fn().mockResolvedValue({ width: 10000, height: 4001 }),
    });
    const result = await validator.validate({ file: makeImageFile({ mimeType: "image/jpeg", name: "huge.jpg" }) });
    expect(result).toEqual({
      ok: false,
      errorCode: BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_TOO_MANY_PIXELS,
    });
  });

  it("rejects decode failures", async () => {
    const validator = createSourceImageFileValidator({
      decodeImageFile: vi.fn().mockRejectedValue(new Error("corrupt")),
    });
    const result = await validator.validate({ file: makeImageFile({ mimeType: "image/jpeg", name: "bad.jpg" }) });
    expect(result).toEqual({
      ok: false,
      errorCode: BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_DECODE_FAILED,
    });
  });

  it("rejects zero-dimension images", async () => {
    const validator = createSourceImageFileValidator({
      decodeImageFile: vi.fn().mockResolvedValue({ width: 0, height: 900 }),
    });
    const result = await validator.validate({ file: makeImageFile({ mimeType: "image/jpeg", name: "zero.jpg" }) });
    expect(result).toEqual({
      ok: false,
      errorCode: BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_DECODE_FAILED,
    });
  });

  it("creates and revokes temporary object URL on successful runtime decode", async () => {
    const createObjectURL = vi.fn(() => "blob:temp");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    class MockImage {
      public naturalWidth = 1200;
      public naturalHeight = 800;
      public onload: null | (() => void) = null;
      public onerror: null | (() => void) = null;
      public set decoding(_value: string) {}
      public set src(_value: string) {
        queueMicrotask(() => {
          this.onload?.();
        });
      }
    }
    vi.stubGlobal("Image", MockImage);

    const validator = createSourceImageFileValidator();
    const result = await validator.validate({ file: makeImageFile({ mimeType: "image/jpeg", name: "runtime.jpg" }) });
    expect(result.ok).toBe(true);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:temp");
  });

  it("revokes temporary object URL when runtime decode fails", async () => {
    const createObjectURL = vi.fn(() => "blob:temp");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });

    class MockImage {
      public naturalWidth = 0;
      public naturalHeight = 0;
      public onload: null | (() => void) = null;
      public onerror: null | (() => void) = null;
      public set decoding(_value: string) {}
      public set src(_value: string) {
        queueMicrotask(() => {
          this.onerror?.();
        });
      }
    }
    vi.stubGlobal("Image", MockImage);

    const validator = createSourceImageFileValidator();
    const result = await validator.validate({ file: makeImageFile({ mimeType: "image/jpeg", name: "broken.jpg" }) });
    expect(result).toEqual({
      ok: false,
      errorCode: BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_DECODE_FAILED,
    });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:temp");
  });
});
