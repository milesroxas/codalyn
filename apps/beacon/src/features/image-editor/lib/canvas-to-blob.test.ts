/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";

import { canvasToBlob } from "./canvas-to-blob";

function canvasWithToBlob(impl: (cb: BlobCallback, type?: string, quality?: unknown) => void): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  vi.spyOn(canvas, "toBlob").mockImplementation(impl);
  return canvas;
}

describe("canvasToBlob", () => {
  it("resolves with the encoded blob and forwards type + quality to the encoder", async () => {
    const seen: { type?: string; quality?: unknown } = {};
    const canvas = canvasWithToBlob((cb, type, quality) => {
      seen.type = type;
      seen.quality = quality;
      cb(new Blob([new Uint8Array([1, 2])], { type: "image/webp" }));
    });

    const blob = await canvasToBlob(canvas, "image/webp", 0.7);

    expect(blob.type).toBe("image/webp");
    expect(seen).toEqual({ type: "image/webp", quality: 0.7 });
  });

  it("rejects with the requested type when the encoder produces no blob", async () => {
    const canvas = canvasWithToBlob((cb) => cb(null));

    await expect(canvasToBlob(canvas, "image/png")).rejects.toThrow(/image\/png encoding produced no blob/);
  });
});
