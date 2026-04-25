import { clampExportDimensionsToMaxEdge } from "@/features/image-editor/lib/clamp-export-dimensions";
import type { ExportDimensions } from "@/features/image-editor/lib/infer-export-dimensions-compute";

/** Set on the Image in Webflow (Settings → Custom attributes) so Beacon uses these export pixels in Auto. */
export const BEACON_EXPORT_WIDTH_ATTR = "data-beacon-export-width";
export const BEACON_EXPORT_HEIGHT_ATTR = "data-beacon-export-height";

function parsePositivePx(s: string | null): number | null {
  if (s == null || s.trim() === "") {
    return null;
  }
  const n = Number(s.trim());
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return Math.round(n);
}

/**
 * When **both** custom attributes are set on the image, returns clamped width/height for export.
 * If either is missing or invalid, returns `null` and Beacon keeps using layout/aspect inference.
 */
export async function readBeaconDesignerExportDimensionsFromImage(
  image: ImageElement
): Promise<{ width: number; height: number } | null> {
  if (image.customAttributes !== true) {
    return null;
  }
  const [wStr, hStr] = await Promise.all([
    image.getCustomAttribute(BEACON_EXPORT_WIDTH_ATTR).catch(() => null),
    image.getCustomAttribute(BEACON_EXPORT_HEIGHT_ATTR).catch(() => null),
  ]);
  const w = parsePositivePx(wStr);
  const h = parsePositivePx(hStr);
  if (w == null || h == null) {
    return null;
  }
  return clampExportDimensionsToMaxEdge(w, h);
}

export function buildDesignerTaggedExportDimensions(width: number, height: number): ExportDimensions {
  const clamped = clampExportDimensionsToMaxEdge(width, height);
  const aspect = clamped.width / Math.max(1, clamped.height);
  return {
    width: clamped.width,
    height: clamped.height,
    note: `Preferred export size from custom attributes on the image (${BEACON_EXPORT_WIDTH_ATTR}, ${BEACON_EXPORT_HEIGHT_ATTR})`,
    aspect,
    aspectSource: "designer-tag",
    longEdge: Math.max(clamped.width, clamped.height),
    longEdgeSource: "designer-tag",
    inferenceSource: "designer-tag",
  };
}
