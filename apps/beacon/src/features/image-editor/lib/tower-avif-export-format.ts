import type { ImageExportFormat } from "@codalyn/webflow-kit";

export type AvifTowerGate = {
  /** Tower image-optimize quota exhausted for this account. */
  imageOptimizeLimitReached: boolean;
  /** User explicitly opted in to sending images to Tower for AVIF conversion. */
  avifTowerConsentGranted: boolean;
};

/**
 * AVIF encoding uploads the image to Codalyn Tower, so it requires the user's explicit opt-in
 * and available quota; otherwise exports fall back to in-Designer WebP.
 */
export function resolveEffectiveExportFormat(
  requestedFormat: ImageExportFormat,
  gate: AvifTowerGate
): ImageExportFormat {
  if (requestedFormat === "avif" && (gate.imageOptimizeLimitReached || !gate.avifTowerConsentGranted)) {
    return "webp";
  }
  return requestedFormat;
}

export function isAvifPresetOverriddenByTowerLimit(input: {
  imageOptimizeLimitReached: boolean;
  presetExportFormat: ImageExportFormat | null | undefined;
}): boolean {
  return input.imageOptimizeLimitReached && input.presetExportFormat === "avif";
}

/** Preset requests AVIF but the user has not opted in to Tower conversion yet. */
export function isAvifPresetAwaitingConsent(input: {
  avifTowerConsentGranted: boolean;
  presetExportFormat: ImageExportFormat | null | undefined;
}): boolean {
  return !input.avifTowerConsentGranted && input.presetExportFormat === "avif";
}
