import { clampEdge } from "@/features/image-editor/lib/apply-cropped-export";

/**
 * `widthOverHeight` is the export aspect ratio (w ÷ h). `maxWidth` is the horizontal edge in pixels.
 * Height is derived so the pair matches the ratio.
 */
export function dimensionsFromMaxWidthAndAspect(
  maxWidth: number,
  widthOverHeight: number
): { width: number; height: number } {
  if (!Number.isFinite(widthOverHeight) || widthOverHeight <= 0) {
    const w = clampEdge(maxWidth);
    return { width: w, height: w };
  }
  const w = clampEdge(maxWidth);
  const h = clampEdge(Math.round(w / widthOverHeight));
  return { width: w, height: h };
}
