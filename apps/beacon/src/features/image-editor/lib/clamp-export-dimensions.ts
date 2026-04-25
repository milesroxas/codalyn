const MAX_EXPORT_EDGE = 2560;
const DEFAULT_W = 1920;
const DEFAULT_H = 1080;

/**
 * Clamps the longer edge to {@link MAX_EXPORT_EDGE} px, preserving aspect ratio.
 */
export function clampExportDimensionsToMaxEdge(w: number, h: number): { width: number; height: number } {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
    return { width: DEFAULT_W, height: DEFAULT_H };
  }
  const max = Math.max(w, h);
  if (max <= MAX_EXPORT_EDGE) {
    return { width: Math.round(w), height: Math.round(h) };
  }
  const s = MAX_EXPORT_EDGE / max;
  return { width: Math.round(w * s), height: Math.round(h * s) };
}
