import type { TowerUsageMeterKind } from "./tower-usage-metering.js";
import { formatTowerUsageRatio } from "./tower-usage-metering.js";

export const TOWER_USAGE_APPROACHING_ALERT_TITLE = "Approaching monthly usage limit";

export function towerUsageMeterLabel(kind: TowerUsageMeterKind): string {
  switch (kind) {
    case "webflowProxy":
      return "Webflow proxy";
    case "cmsWrite":
      return "CMS writes";
    case "image":
      return "Image optimize (AVIF)";
  }
}

export function towerUsageApproachingAlertDescription(
  meters: ReadonlyArray<{ kind: TowerUsageMeterKind; used: number; limit: number }>
): string {
  if (meters.length === 0) {
    return "You have used at least 80% of a monthly limit on your plan.";
  }
  const lines = meters.map(
    (meter) => `${towerUsageMeterLabel(meter.kind)}: ${formatTowerUsageRatio(meter.used, meter.limit)}`
  );
  return `You have used at least 80% of your monthly allowance for ${lines.join("; ")}. Upgrade to Pro or wait until the month resets (UTC).`;
}

export const TOWER_USAGE_LIMIT_DIALOG_TITLE = "Monthly limit reached";

export const TOWER_AVIF_LIMIT_FALLBACK_TITLE = "Monthly AVIF limit reached";

export const TOWER_AVIF_LIMIT_FALLBACK_DESCRIPTION =
  "You've reached your AVIF export limit for this preview period. This preset will export as WebP until your limit resets.";

export function towerUsageLimitDialogTitle(kind: TowerUsageMeterKind): string {
  if (kind === "image") {
    return TOWER_AVIF_LIMIT_FALLBACK_TITLE;
  }
  return TOWER_USAGE_LIMIT_DIALOG_TITLE;
}

export function towerUsageLimitDialogDescription(kind: TowerUsageMeterKind): string {
  if (kind === "image") {
    return TOWER_AVIF_LIMIT_FALLBACK_DESCRIPTION;
  }
  if (kind === "cmsWrite") {
    return "You've used your free plan allowance for CMS layout writes through Tower this month.";
  }
  return "You've used your free plan allowance for Webflow Data API proxy traffic through Tower this month.";
}

export function towerUsageLimitDialogUsageLine(used: number, limit: number, kind: TowerUsageMeterKind): string {
  const label =
    kind === "image" ? "AVIF optimizes" : kind === "cmsWrite" ? "CMS writes" : "Webflow proxy requests";
  return `${used.toLocaleString()} / ${limit.toLocaleString()} ${label} used this month (UTC).`;
}

export const TOWER_USAGE_LIMIT_DIALOG_WEBP_HINT = "Switch to WebP to export in the Designer without using Tower.";

export const TOWER_USAGE_LIMIT_DIALOG_DISMISS_LABEL = "Close";

export const TOWER_USAGE_LIMIT_RESET_LABEL = "Resets";

/** First instant of the next UTC calendar month (Tower monthly metering boundary). */
export function towerUsageLimitResetsAtUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

export function towerUsageLimitResetDetailLine(now: Date = new Date()): string {
  const resetsAt = towerUsageLimitResetsAtUtc(now);
  const date = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(resetsAt);
  return `${date} · UTC`;
}
