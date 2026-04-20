import type { Area } from "react-easy-crop";

/**
 * Stable string for when export *source* geometry (source, crop, output size) changes.
 * Format is intentionally excluded — swapping WebP↔AVIF should not reset the user's
 * commit nonce; the estimate effect lists `exportFormat` in its own deps and will re-run.
 */
export function getExportGeometryKey(
  imageSrc: string | null,
  completedCrop: Area | null,
  outputWidth: number,
  outputHeight: number
): string {
  const cropPart = completedCrop
    ? `${completedCrop.x},${completedCrop.y},${completedCrop.width},${completedCrop.height}`
    : "";
  return `${imageSrc ?? ""}|${cropPart}|${outputWidth}|${outputHeight}`;
}
