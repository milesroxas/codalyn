import type { TowerLimitsSnapshot, TowerTierLimits } from "@/server/billing/tower-limits-config";

/**
 * Limit tokens let CMS marketing copy reference the operator-configured usage
 * limits instead of hardcoding numbers, keeping the platform-metering settings
 * (operator dashboard → `towerPlatformMetering`) the single source of truth.
 *
 * Syntax: `{{limits.<tier>.<metric>}}` inside any CMS text field, e.g.
 * `{{limits.pro.webflowUpdates}} Webflow updates / month`.
 *
 * Tiers: `free` | `pro` | `studio` | `team`.
 * Metrics (marketing aliases and raw snapshot keys both accepted):
 * - `webflowUpdates` / `webflowProxyRequestsPerMonth`
 * - `cmsWrites` / `cmsWritesPerMonth`
 * - `imageCredits` / `imageOptimizesPerMonth`
 *
 * Unknown tokens are left verbatim so authors can spot typos on the page.
 */

const TIERS = ["free", "pro", "studio", "team"] as const;
type TierKey = (typeof TIERS)[number];

const METRIC_ALIASES: Record<string, keyof TowerTierLimits> = {
  webflowUpdates: "webflowProxyRequestsPerMonth",
  webflowProxyRequestsPerMonth: "webflowProxyRequestsPerMonth",
  cmsWrites: "cmsWritesPerMonth",
  cmsWritesPerMonth: "cmsWritesPerMonth",
  imageCredits: "imageOptimizesPerMonth",
  imageOptimizesPerMonth: "imageOptimizesPerMonth",
};

const TOKEN_PATTERN = /\{\{\s*limits\.([A-Za-z]+)\.([A-Za-z]+)\s*\}\}/g;

const numberFormatter = new Intl.NumberFormat("en-US");

function isTierKey(raw: string): raw is TierKey {
  return (TIERS as readonly string[]).includes(raw);
}

/** Resolve one `tier`/`metric` pair against the snapshot; null when either segment is unknown. */
export function resolveLimitToken(snapshot: TowerLimitsSnapshot, tier: string, metric: string): string | null {
  if (!isTierKey(tier)) {
    return null;
  }
  const metricKey = METRIC_ALIASES[metric];
  if (!metricKey) {
    return null;
  }
  const value = snapshot[tier][metricKey];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return numberFormatter.format(value);
}

/** Replace every `{{limits.*}}` token in a string; unknown tokens stay verbatim. */
export function resolveLimitTokensInText(text: string, snapshot: TowerLimitsSnapshot): string {
  return text.replace(TOKEN_PATTERN, (match, tier: string, metric: string) => {
    return resolveLimitToken(snapshot, tier, metric) ?? match;
  });
}

/**
 * Deep-walk any JSON-ish value (CMS page data, block arrays, lexical rich
 * text) and resolve limit tokens in every string. Non-string leaves pass
 * through untouched; input is not mutated.
 */
export function applyLimitTokens<T>(value: T, snapshot: TowerLimitsSnapshot): T {
  if (typeof value === "string") {
    return resolveLimitTokensInText(value, snapshot) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => applyLimitTokens(item, snapshot)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = applyLimitTokens(entry, snapshot);
    }
    return out as T;
  }
  return value;
}
