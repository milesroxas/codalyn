import type { Area } from "react-easy-crop";

import { loadImage } from "./load-image";

/**
 * Draws the cropped region of `imageSrc` onto a fresh `OffscreenCanvas` sized to the export
 * dimensions. The canvas is never displayed — it only feeds `canvasToBlob` — so no DOM element is
 * created (see canvas-to-blob.ts for why the offscreen path is also the Marketplace-preferred one).
 * `OffscreenCanvas` is available in every browser the Webflow Designer supports (Chrome 69+,
 * Firefox 105+, Safari 16.4+); the explicit guard turns a missing implementation into a clear error
 * instead of a TypeError deep in the export flow.
 */
export async function renderCroppedRegionToCanvas(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number,
  outputHeight: number
): Promise<OffscreenCanvas> {
  if (typeof OffscreenCanvas === "undefined") {
    throw new Error("Image export needs OffscreenCanvas support — please update your browser.");
  }
  const image = await loadImage(imageSrc);
  const canvas = new OffscreenCanvas(Math.max(1, Math.round(outputWidth)), Math.max(1, Math.round(outputHeight)));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}
