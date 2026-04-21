export const BEACON_QUALITY_POPOUT_SOURCE = "beacon-quality-popout-v1" as const;
export const BEACON_QUALITY_PARENT_SOURCE = "beacon-quality-parent-v1" as const;

export type QualityPopoutToParentMessage =
  | { source: typeof BEACON_QUALITY_POPOUT_SOURCE; type: "preview-quality-changed"; quality: number }
  | { source: typeof BEACON_QUALITY_POPOUT_SOURCE; type: "save-and-close"; quality: number };

export function isQualityPopoutMessage(data: unknown): data is QualityPopoutToParentMessage {
  if (!data || typeof data !== "object") {
    return false;
  }
  const d = data as Record<string, unknown>;
  if (d.source !== BEACON_QUALITY_POPOUT_SOURCE) {
    return false;
  }
  if (d.type === "preview-quality-changed" && typeof d.quality === "number") {
    return true;
  }
  if (d.type === "save-and-close" && typeof d.quality === "number") {
    return true;
  }
  return false;
}
