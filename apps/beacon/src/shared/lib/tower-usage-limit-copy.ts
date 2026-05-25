import type { TowerUsageMeterKind } from "@/shared/lib/tower-usage-limit-error";

export const TOWER_AVIF_LIMIT_FALLBACK_TITLE = "Monthly AVIF limit reached";

export const TOWER_AVIF_LIMIT_FALLBACK_DESCRIPTION =
  "You've reached your AVIF export limit for this preview period. This preset will export as WebP until your limit resets.";

export const TOWER_USAGE_LIMIT_DIALOG_TITLE = "Monthly limit reached";

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
  return "You've used your free plan allowance for Webflow API traffic through Tower this month.";
}

export function towerUsageLimitDialogUsageLine(used: number, limit: number, kind: TowerUsageMeterKind): string {
  const label = kind === "image" ? "AVIF optimizes" : "Webflow API units";
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
