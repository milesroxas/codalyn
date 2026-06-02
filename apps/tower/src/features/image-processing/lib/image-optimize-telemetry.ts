import type { ImageExportFormat } from "@codalyn/webflow-kit";
import type { TowerTier } from "@/server/billing/entitlements";

/** Stable event name for internal image-optimization telemetry (not a customer-facing meter). */
export const IMAGE_OPTIMIZE_TELEMETRY_EVENT = "tower.image_optimize";

/**
 * Internal infra-protection telemetry for the highest-risk path (large image → AVIF).
 * Lets us validate whether early-access credit caps are profitable before raising limits.
 * Intentionally internal: customers see "Image optimization credits", never CPU seconds or raw bytes.
 */
export type ImageOptimizeTelemetry = {
  ok: boolean;
  userId: string | null;
  organizationId: string | null;
  tier: TowerTier | null;
  plan: TowerTier | null;
  format: ImageExportFormat;
  quality: number;
  inputBytes: number;
  outputBytes: number | null;
  /** Output dimensions (== source dimensions; the optimizer does not resize). */
  width: number | null;
  height: number | null;
  /** Image optimization credits charged for this request (0 when unmetered/blocked). */
  credits: number | null;
  durationMs: number;
  errorCode?: string;
};

export function logImageOptimizeTelemetry(event: ImageOptimizeTelemetry): void {
  console.info(
    JSON.stringify({
      event: IMAGE_OPTIMIZE_TELEMETRY_EVENT,
      ...event,
    })
  );
}
