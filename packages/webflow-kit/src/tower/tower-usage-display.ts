import type { TowerUsageMeterKind, TowerUsageMeterSnapshot, TowerUsageStatusSnapshot } from "./tower-usage-metering.js";
import { towerUsageMeterLabel } from "./tower-usage-metering-copy.js";
import type { TowerUsageFeatureKey } from "./tower-usage-product-feature.js";
import { TOWER_USAGE_FEATURE_KEYS, towerUsageProductFeatureLabel } from "./tower-usage-product-feature.js";
import type { TowerUsageDesignerApiBreakdown } from "./webflow-proxy-usage-category.js";

export type TowerUsageFeatureGroup = {
  feature: TowerUsageFeatureKey;
  label: string;
  description: string;
  meters: TowerUsageMeterSnapshot[];
};

const TOWER_USAGE_FEATURE_LABELS: Record<TowerUsageFeatureKey, { label: string; description: string }> = {
  cmsSlots: {
    label: towerUsageProductFeatureLabel("cmsSlots"),
    description: "Slot targets, Composer, and page script setup in the Designer.",
  },
  imageUpload: {
    label: towerUsageProductFeatureLabel("imageUpload"),
    description: "Image optimization credits and publishing images to CMS collection fields.",
  },
};

// `cmsWrite` is intentionally omitted: no client path increments it yet, so it would render as a
// permanently-zero meter. It stays in the snapshot and policy (and operator views) until it is wired.
const FEATURE_METER_KINDS: Record<TowerUsageFeatureKey, readonly TowerUsageMeterKind[]> = {
  cmsSlots: ["webflowProxy"],
  imageUpload: ["image"],
};

export function buildTowerUsageFeatureGroups(meters: readonly TowerUsageMeterSnapshot[]): TowerUsageFeatureGroup[] {
  const meterByKind = new Map(meters.map((meter) => [meter.kind, meter]));

  return TOWER_USAGE_FEATURE_KEYS.flatMap((feature) => {
    const groupMeters = FEATURE_METER_KINDS[feature]
      .map((kind) => meterByKind.get(kind))
      .filter((meter): meter is TowerUsageMeterSnapshot => meter != null);

    if (groupMeters.length === 0) {
      return [];
    }

    const meta = TOWER_USAGE_FEATURE_LABELS[feature];
    return [
      {
        feature,
        label: meta.label,
        description: meta.description,
        meters: groupMeters,
      },
    ];
  });
}

export function findTowerUsageMeter(
  meters: readonly TowerUsageMeterSnapshot[],
  kind: TowerUsageMeterKind
): TowerUsageMeterSnapshot | null {
  return meters.find((meter) => meter.kind === kind) ?? null;
}

export type TowerUsageDisplayContext = {
  meters: readonly TowerUsageMeterSnapshot[];
  designerApiBreakdown: TowerUsageDesignerApiBreakdown | null;
};

export function buildTowerUsageDisplayContext(
  meters: readonly TowerUsageMeterSnapshot[],
  designerApiBreakdown: TowerUsageDesignerApiBreakdown | null
): TowerUsageDisplayContext {
  return {
    meters,
    designerApiBreakdown,
  };
}

/** A single quantitative driver of usage (a `webflowProxy` category or the image meter). */
export type TowerUsageContributionSegment = {
  key: "cmsSlots" | "imageUploadCms" | "image";
  label: string;
  value: number;
};

/**
 * "What's driving usage" segments for the active scope, single-sourced for the billing breakdown: the
 * two Webflow-update categories (from the designer API breakdown) plus image optimization credits.
 * `cmsWrite` is omitted to match the end-user feature display. Returns non-zero segments, largest first.
 */
export function buildTowerUsageContributionSegments(
  status: Pick<TowerUsageStatusSnapshot, "meters" | "designerApiBreakdown">
): TowerUsageContributionSegment[] {
  const segments: TowerUsageContributionSegment[] = [];
  const breakdown = status.designerApiBreakdown;
  if (breakdown) {
    segments.push({ key: "cmsSlots", label: towerUsageProductFeatureLabel("cmsSlots"), value: breakdown.cmsSlots });
    segments.push({
      key: "imageUploadCms",
      label: towerUsageProductFeatureLabel("imageUpload"),
      value: breakdown.imageUploadCms,
    });
  }
  const image = findTowerUsageMeter(status.meters, "image");
  if (image) {
    segments.push({ key: "image", label: towerUsageMeterLabel("image"), value: image.used });
  }
  return segments.filter((segment) => segment.value > 0).sort((a, b) => b.value - a.value);
}
