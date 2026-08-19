import { describe, expect, it, vi } from "vitest";

import { canvasToBlob } from "./canvas-to-blob";

function fakeOffscreenCanvas(convertToBlob: (options?: ImageEncodeOptions) => Promise<Blob>): OffscreenCanvas {
  return { convertToBlob } as unknown as OffscreenCanvas;
}

describe("canvasToBlob", () => {
  it("resolves with the encoded blob and forwards type + quality to the encoder", async () => {
    const convertToBlob = vi.fn(async () => new Blob([new Uint8Array([1, 2])], { type: "image/webp" }));

    const blob = await canvasToBlob(fakeOffscreenCanvas(convertToBlob), "image/webp", 0.7);

    expect(blob.type).toBe("image/webp");
    expect(convertToBlob).toHaveBeenCalledWith({ type: "image/webp", quality: 0.7 });
  });

  it("omits quality from the encode options when none is given (lossless formats)", async () => {
    const convertToBlob = vi.fn(async () => new Blob([], { type: "image/png" }));

    await canvasToBlob(fakeOffscreenCanvas(convertToBlob), "image/png");

    expect(convertToBlob).toHaveBeenCalledWith({ type: "image/png" });
  });

  it("rejects with the requested type when the encoder fails", async () => {
    const convertToBlob = vi.fn(async () => {
      throw new DOMException("encode failed", "EncodingError");
    });

    await expect(canvasToBlob(fakeOffscreenCanvas(convertToBlob), "image/png")).rejects.toThrow(
      /image\/png encoding failed: encode failed/
    );
  });
});
