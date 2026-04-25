/**
 * Public entry for export-dimension resolution from a canvas `Image` (or a component's
 * bound image). If the image has both **`data-beacon-export-width` and
 * `data-beacon-export-height` custom attributes**, those values win (clamped) for export
 * size. Otherwise Beacon infers from **`aspect-ratio`** on the image and its nearest
 * ancestors, then file / defaults — see {@link inferExportDimensionsForTarget} in
 * `infer-export-dimensions-from-canvas-image`.
 */

export { clampExportDimensionsToMaxEdge } from "@/features/image-editor/lib/clamp-export-dimensions";
export type { ExportDimensionInferenceSource } from "@/features/image-editor/lib/infer-export-dimensions-compute";
export { inferExportDimensionsForTarget } from "@/features/image-editor/lib/infer-export-dimensions-from-canvas-image";
