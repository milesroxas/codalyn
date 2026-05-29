export const TOWER_USAGE_PRODUCT_FEATURES = ["cmsSlots", "imageUpload"] as const;

export type TowerUsageProductFeature = (typeof TOWER_USAGE_PRODUCT_FEATURES)[number];

/** Alias used by usage display grouping. */
export const TOWER_USAGE_FEATURE_KEYS = TOWER_USAGE_PRODUCT_FEATURES;

export type TowerUsageFeatureKey = TowerUsageProductFeature;

const TOWER_USAGE_PRODUCT_FEATURE_LABELS: Record<TowerUsageProductFeature, string> = {
  cmsSlots: "CMS Slots",
  imageUpload: "Image Upload",
};

const TOWER_USAGE_PRODUCT_NAME_TO_KEY: Record<string, TowerUsageProductFeature> = {
  "CMS Slots": "cmsSlots",
  "Image Upload": "imageUpload",
};

export function towerUsageProductFeatureLabel(product: TowerUsageProductFeature): string {
  return TOWER_USAGE_PRODUCT_FEATURE_LABELS[product];
}

export function parseTowerUsageProductFeature(name: string): TowerUsageProductFeature | null {
  return TOWER_USAGE_PRODUCT_NAME_TO_KEY[name] ?? null;
}
