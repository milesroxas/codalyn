/**
 * Encodes the canvas holding the user's cropped image into an image file (WebP export, PNG
 * preview / AVIF upload source). This is the image editor's export step and the only place the
 * extension turns canvas pixels into bytes.
 *
 * Not fingerprinting (Webflow Marketplace "Fingerprinting & Session Replay"): nothing is ever read
 * back from a canvas for identification — no `getImageData`, no `toDataURL`, no hashing — and the
 * encoded bytes are the user's own asset, which only ever goes where the user sends it (Webflow
 * asset upload, or Codalyn Tower after an explicit AVIF opt-in). Keep every canvas encode routed
 * through this one helper so that review surface stays a single, auditable call site.
 */
export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(`${type} encoding produced no blob`));
        }
      },
      type,
      quality
    );
  });
}
