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

/** User-facing Beacon actions that increment each meter (one API call = one unit unless noted). */
export const TOWER_USAGE_METER_CONTRIBUTING_ACTIONS: Record<TowerUsageMeterKind, readonly string[]> = {
  webflowProxy: [
    "CMS Slots — install or sync the page script",
    "CMS Slots — create a list target or link it to a CMS field",
    "CMS Slots — open or save a layout in Composer on a collection template",
    "Image Upload — publish an image to a CMS collection field",
  ],
  cmsWrite: ["CMS Slots — save a block-based layout composition through Tower's layout API"],
  image: [
    "Image Upload — export an image as AVIF",
    "Image Upload — AVIF size estimates while adjusting crop, size, or quality",
  ],
};

function formatContributingActions(actions: readonly string[]): string {
  return actions.map((action) => `• ${action}`).join("\n");
}

function uniqueMeterFeatureNames(kind: TowerUsageMeterKind): string {
  const names = [
    ...new Set(
      TOWER_USAGE_METER_CONTRIBUTING_ACTIONS[kind].map((action) => {
        const parts = action.split(" — ");
        return parts[0]?.trim() ?? action;
      })
    ),
  ];
  if (names.length === 0) {
    return "";
  }
  if (names.length === 1) {
    return names[0] ?? "";
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function towerUsageMeterTooltip(kind: TowerUsageMeterKind): string {
  const actions = formatContributingActions(TOWER_USAGE_METER_CONTRIBUTING_ACTIONS[kind]);
  switch (kind) {
    case "webflowProxy":
      return `Each Webflow Data API request through Tower counts as one. A single action may use several requests.\n\nCounts when you:\n${actions}\n\nComposer saves to a CMS text field and CMS field uploads use this meter. AVIF exports and layout API saves are counted separately.`;
    case "cmsWrite":
      return `Each layout save through Tower's CMS layout API counts as one.\n\nCounts when you:\n${actions}\n\nSaving slot order in Composer to a CMS text field counts toward Webflow proxy instead. Loading layouts does not count.`;
    case "image":
      return `Each AVIF optimize request through Tower counts as one.\n\nCounts when you:\n${actions}\n\nWebP exports in the Designer do not count toward this limit.`;
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
  return `You have used at least 80% of your monthly allowance for ${lines.join("; ")}. Upgrade to Pro or wait until the month resets.`;
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
  const scope = uniqueMeterFeatureNames(kind);
  if (kind === "image") {
    return `${TOWER_AVIF_LIMIT_FALLBACK_DESCRIPTION} Applies to ${scope}.`;
  }
  if (kind === "cmsWrite") {
    return `You've used your free plan allowance for CMS layout saves through Tower this month. Applies to ${scope}. Composer text-field saves count toward Webflow proxy instead.`;
  }
  return `You've used your free plan allowance for Webflow Data API traffic through Tower this month. Applies to ${scope}.`;
}

export function towerUsageLimitDialogUsageLine(used: number, limit: number, kind: TowerUsageMeterKind): string {
  const label = kind === "image" ? "AVIF optimizes" : kind === "cmsWrite" ? "CMS writes" : "Webflow proxy requests";
  return `${used.toLocaleString()} / ${limit.toLocaleString()} ${label} used this month.`;
}

export const TOWER_USAGE_LIMIT_DIALOG_WEBP_HINT = "Switch to WebP to export in the Designer without using Tower.";

export const TOWER_USAGE_LIMIT_DIALOG_DISMISS_LABEL = "Close";

export const TOWER_USAGE_LIMIT_RESET_LABEL = "Resets";

const UTC_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** First instant of the next UTC calendar month (Tower monthly metering boundary). */
export function towerUsageLimitResetsAtUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

export function towerUsageLimitResetDetailLine(now: Date = new Date()): string {
  const resetsAt = towerUsageLimitResetsAtUtc(now);
  const month = UTC_MONTH_NAMES[resetsAt.getUTCMonth()];
  return `${month} ${resetsAt.getUTCDate()}, ${resetsAt.getUTCFullYear()}`;
}
