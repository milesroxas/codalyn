/**
 * Encodes the offscreen canvas holding the user's cropped image into an image file (WebP export,
 * PNG preview / AVIF upload source). This is the image editor's export step and the only place the
 * extension turns canvas pixels into bytes — keep every encode routed through this one helper so
 * the review surface stays a single, auditable call site.
 *
 * Not fingerprinting (Webflow Marketplace "Fingerprinting & Session Replay"): nothing is ever read
 * back from a canvas for identification — no `getImageData`, no `toDataURL`, no hashing — and the
 * encoded bytes are the user's own asset, which only ever goes where the user sends it (Webflow
 * asset upload, or Codalyn Tower after an explicit AVIF opt-in).
 *
 * Why `OffscreenCanvas.convertToBlob` rather than an `HTMLCanvasElement` + `toBlob`: the crop
 * render never needs a DOM node (nothing displays it), `convertToBlob` is promise-native, and the
 * Marketplace preflight scanner treats the DOM-canvas `toBlob`/`toDataURL`/`getImageData` family as
 * a fingerprinting signal regardless of use — App Review Preflight flagged the previous `toBlob`
 * helper twice (2026-08-19, "Fingerprinting & Session Replay"). Same capability, disclosed in the
 * compliance doc (R7b.9); `scripts/build-cli.mjs` now forbids the DOM-readback family in release
 * bundles so a future regression trips the gate instead of the scanner.
 */
export async function canvasToBlob(canvas: OffscreenCanvas, type: string, quality?: number): Promise<Blob> {
  const options: ImageEncodeOptions = quality === undefined ? { type } : { type, quality };
  try {
    return await canvas.convertToBlob(options);
  } catch (err) {
    throw new Error(`${type} encoding failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
