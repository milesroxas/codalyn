export const BEACON_QUALITY_POPOUT_SOURCE = "beacon-quality-popout-v1" as const;
export const BEACON_QUALITY_PARENT_SOURCE = "beacon-quality-parent-v1" as const;

export type QualityPopoutToParentMessage =
  | { source: typeof BEACON_QUALITY_POPOUT_SOURCE; type: "ready" }
  | { source: typeof BEACON_QUALITY_POPOUT_SOURCE; type: "preview-quality-changed"; quality: number }
  | { source: typeof BEACON_QUALITY_POPOUT_SOURCE; type: "save-and-close"; quality: number };

/**
 * Opener → popout messages. `init` answers the popout's `ready` announcement with the image Blobs
 * (structured-cloned; the popout mints its own object URLs) and initial settings — the popout is a
 * static page shipped in the bundle (public/quality-compare.html), so it carries no baked-in data.
 */
export type QualityParentToPopoutMessage =
  | {
      source: typeof BEACON_QUALITY_PARENT_SOURCE;
      type: "init";
      originalBlob: Blob;
      compressedBlob: Blob;
      aspectRatio: number;
      initialQuality: number;
    }
  | { source: typeof BEACON_QUALITY_PARENT_SOURCE; type: "compressed-updated"; compressedBlob: Blob }
  | { source: typeof BEACON_QUALITY_PARENT_SOURCE; type: "compressed-error" };

export function isQualityPopoutMessage(data: unknown): data is QualityPopoutToParentMessage {
  if (!data || typeof data !== "object") {
    return false;
  }
  const d = data as Record<string, unknown>;
  if (d.source !== BEACON_QUALITY_POPOUT_SOURCE) {
    return false;
  }
  if (d.type === "ready") {
    return true;
  }
  if (d.type === "preview-quality-changed" && typeof d.quality === "number") {
    return true;
  }
  if (d.type === "save-and-close" && typeof d.quality === "number") {
    return true;
  }
  return false;
}
