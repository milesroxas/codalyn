import type { TowerUsageMeterKind, TowerUsageMeterSnapshot } from "./tower-usage-metering.js";
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

const FEATURE_METER_KINDS: Record<TowerUsageFeatureKey, readonly TowerUsageMeterKind[]> = {
  cmsSlots: ["webflowProxy", "cmsWrite"],
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
