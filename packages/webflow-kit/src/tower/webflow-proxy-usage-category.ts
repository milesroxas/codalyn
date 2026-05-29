export const WEBFLOW_PROXY_USAGE_CATEGORIES = ["cmsSlots", "imageUploadCms"] as const;

export type WebflowProxyUsageCategory = (typeof WEBFLOW_PROXY_USAGE_CATEGORIES)[number];

export type TowerUsageDesignerApiBreakdown = {
  cmsSlots: number;
  imageUploadCms: number;
};

const IMAGE_UPLOAD_CMS_LIVE_PATH = /^collections\/[^/]+\/items\/[^/]+\/live$/i;

/**
 * Classifies a Tower `/api/v2/webflow/*` proxy path for usage breakdown display.
 * Enforcement still uses the shared Designer API (webflow proxy) monthly cap.
 */
export function classifyWebflowProxyUsage(segments: readonly string[]): WebflowProxyUsageCategory {
  const path = segments.join("/");
  if (IMAGE_UPLOAD_CMS_LIVE_PATH.test(path)) {
    return "imageUploadCms";
  }
  return "cmsSlots";
}

export function buildTowerUsageDesignerApiBreakdown(
  cmsSlots: number,
  imageUploadCms: number
): TowerUsageDesignerApiBreakdown {
  return {
    cmsSlots: Math.max(0, Math.trunc(cmsSlots)),
    imageUploadCms: Math.max(0, Math.trunc(imageUploadCms)),
  };
}

export function hasTowerUsageDesignerApiBreakdown(
  breakdown: TowerUsageDesignerApiBreakdown | null | undefined
): breakdown is TowerUsageDesignerApiBreakdown {
  if (!breakdown) {
    return false;
  }
  return breakdown.cmsSlots + breakdown.imageUploadCms > 0;
}

export function formatTowerUsageDesignerApiBreakdown(breakdown: TowerUsageDesignerApiBreakdown): string {
  const parts: string[] = [];
  if (breakdown.cmsSlots > 0) {
    parts.push(`CMS Slots ${breakdown.cmsSlots.toLocaleString()}`);
  }
  if (breakdown.imageUploadCms > 0) {
    parts.push(`Image Upload ${breakdown.imageUploadCms.toLocaleString()}`);
  }
  return parts.join(" · ");
}
