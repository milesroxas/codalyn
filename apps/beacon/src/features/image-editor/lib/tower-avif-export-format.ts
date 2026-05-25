import type { ImageExportFormat } from "@codalyn/webflow-kit";

/** Uses WebP when Tower image optimize quota is exhausted. */
export function resolveEffectiveExportFormat(
  requestedFormat: ImageExportFormat,
  imageOptimizeLimitReached: boolean
): ImageExportFormat {
  if (imageOptimizeLimitReached && requestedFormat === "avif") {
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
