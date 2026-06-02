import type { TowerUsageMeterKind, TowerUsageScope } from "./tower-usage-metering.js";
import { formatTowerUsageRatio } from "./tower-usage-metering.js";
import type { TowerUsageProductFeature } from "./tower-usage-product-feature.js";
import { parseTowerUsageProductFeature, towerUsageProductFeatureLabel } from "./tower-usage-product-feature.js";

export const TOWER_USAGE_APPROACHING_ALERT_TITLE = "Approaching monthly usage limit";

/**
 * One-line explanation of how the reported usage is scoped, so UIs never imply Team is just higher
 * per-user caps. Workspace scope is a shared pool; user scope follows the individual across workspaces.
 */
export function towerUsageScopeSummary(usageScope: TowerUsageScope): string {
  return usageScope === "workspace"
    ? "Pooled across this workspace and shared by everyone on it. The pool scales with paid seats."
    : "Applies to you across your solo and unpaid workspaces.";
}

export function towerUsageMeterLabel(kind: TowerUsageMeterKind): string {
  switch (kind) {
    case "webflowProxy":
      return "Designer API requests";
    case "cmsWrite":
      return "Layout saves";
    case "image":
      return "Image optimization credits";
  }
}

/** User-facing Beacon actions that increment each meter (one API call = one unit unless noted). */
export const TOWER_USAGE_METER_CONTRIBUTING_ACTIONS: Record<TowerUsageMeterKind, readonly string[]> = {
  webflowProxy: [
    "CMS Slots — Setting up or syncing the page script",
    "CMS Slots — Creating a slot target",
    "CMS Slots — Connecting a slot to a CMS field",
    "CMS Slots — Opening or saving a Composer layout on a collection template",
    "Image Upload — Publishing an image to a CMS collection field",
  ],
  cmsWrite: ["CMS Slots — Saving a block-based layout composition in Composer"],
  image: [
    "Image Upload — Optimizing an AVIF image export through Tower",
    "Image Upload — Previewing optimized size estimates while adjusting crop, size, or quality",
  ],
};

export type TowerUsageMeterTooltipAction = {
  product: TowerUsageProductFeature;
  detail: string;
};

export type TowerUsageMeterTooltipActionGroup = {
  product: TowerUsageProductFeature;
  details: readonly string[];
};

export type TowerUsageMeterTooltipContent = {
  title?: string;
  summary: string;
  sectionHeading: string;
  actionGroups: readonly TowerUsageMeterTooltipActionGroup[];
  footnoteHeading?: string;
  footnote: string;
};

const TOWER_USAGE_METER_TOOLTIP_SECTION_HEADING = "Actions that use this limit";
const TOWER_USAGE_METER_TOOLTIP_FOOTNOTE_HEADING = "Separate limits";

function parseContributingAction(action: string): TowerUsageMeterTooltipAction | null {
  const separatorIndex = action.indexOf(" — ");
  if (separatorIndex === -1) {
    return null;
  }

  const productName = action.slice(0, separatorIndex).trim();
  const product = parseTowerUsageProductFeature(productName);
  if (product == null) {
    return null;
  }

  return {
    product,
    detail: action.slice(separatorIndex + 3).trim(),
  };
}

function groupTooltipActions(actions: readonly TowerUsageMeterTooltipAction[]): TowerUsageMeterTooltipActionGroup[] {
  const groups: TowerUsageMeterTooltipActionGroup[] = [];
  const indexByProduct = new Map<TowerUsageProductFeature, number>();

  for (const action of actions) {
    const existingIndex = indexByProduct.get(action.product);
    if (existingIndex != null) {
      const group = groups[existingIndex];
      if (group) {
        groups[existingIndex] = { product: group.product, details: [...group.details, action.detail] };
      }
      continue;
    }

    indexByProduct.set(action.product, groups.length);
    groups.push({ product: action.product, details: [action.detail] });
  }

  return groups;
}

function parseMeterContributingActions(kind: TowerUsageMeterKind): readonly TowerUsageMeterTooltipAction[] {
  return TOWER_USAGE_METER_CONTRIBUTING_ACTIONS[kind].flatMap((action) => {
    const parsed = parseContributingAction(action);
    return parsed ? [parsed] : [];
  });
}

function uniqueMeterFeatureNames(kind: TowerUsageMeterKind): string {
  const names = [
    ...new Set(parseMeterContributingActions(kind).map((action) => towerUsageProductFeatureLabel(action.product))),
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

export function towerUsageMeterTooltipContent(kind: TowerUsageMeterKind): TowerUsageMeterTooltipContent {
  const actionGroups = groupTooltipActions(parseMeterContributingActions(kind));

  switch (kind) {
    case "webflowProxy":
      return {
        title: "Shared Webflow request limit",
        summary:
          "Beacon uses this limit whenever it updates your Webflow site. CMS Slots and Image Upload both count toward this same monthly limit.",
        sectionHeading: TOWER_USAGE_METER_TOOLTIP_SECTION_HEADING,
        actionGroups,
        footnoteHeading: TOWER_USAGE_METER_TOOLTIP_FOOTNOTE_HEADING,
        footnote:
          "Layout saves and image optimization credits have their own monthly limits. One action may use more than one Webflow request.",
      };
    case "cmsWrite":
      return {
        title: "Layout save limit",
        summary:
          "Beacon uses this limit when CMS Slots saves a block-based layout through Tower. Each save counts as one.",
        sectionHeading: TOWER_USAGE_METER_TOOLTIP_SECTION_HEADING,
        actionGroups,
        footnoteHeading: TOWER_USAGE_METER_TOOLTIP_FOOTNOTE_HEADING,
        footnote:
          "Designer API requests and image optimization credits have their own monthly limits. Saving slot order to a CMS text field counts toward Designer API requests instead. Loading layouts does not count.",
      };
    case "image":
      return {
        title: "Image optimization credit limit",
        summary:
          "Beacon uses these credits when Image Upload optimizes images through Tower. Larger or higher-effort optimizations use more credits.",
        sectionHeading: TOWER_USAGE_METER_TOOLTIP_SECTION_HEADING,
        actionGroups,
        footnoteHeading: TOWER_USAGE_METER_TOOLTIP_FOOTNOTE_HEADING,
        footnote:
          "Designer API requests and layout saves have their own monthly limits. WebP exports in the Designer do not use credits.",
      };
  }
}

export function towerUsageMeterTooltip(kind: TowerUsageMeterKind): string {
  const content = towerUsageMeterTooltipContent(kind);
  const actionLines = content.actionGroups
    .map((group) => {
      const label = towerUsageProductFeatureLabel(group.product);
      const detailLines = group.details.map((detail) => `  • ${detail}`).join("\n");
      return `${label}\n${detailLines}`;
    })
    .join("\n\n");

  const titlePart = content.title ? `${content.title}\n\n` : "";
  const footnotePart = content.footnoteHeading ? `${content.footnoteHeading}\n${content.footnote}` : content.footnote;

  return `${titlePart}${content.summary}\n\n${content.sectionHeading}\n${actionLines}\n\n${footnotePart}`;
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
  return `You have used at least 80% of your monthly allowance for ${lines.join("; ")}. These limits reset at the start of next month.`;
}

export const TOWER_USAGE_LIMIT_DIALOG_TITLE = "Monthly limit reached";

export const TOWER_AVIF_LIMIT_FALLBACK_TITLE = "Image optimization credits used up";

export const TOWER_AVIF_LIMIT_FALLBACK_DESCRIPTION =
  "You've used all your image optimization credits for this period. AVIF presets will export as WebP until your credits reset.";

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
    return `You've reached your monthly limit for CMS layout saves through Tower this month. Applies to ${scope}. Composer text-field saves count toward Designer API requests instead.`;
  }
  return `You've reached your monthly limit for Designer API requests through Tower this month. Applies to ${scope}.`;
}

export function towerUsageLimitDialogUsageLine(used: number, limit: number, kind: TowerUsageMeterKind): string {
  const label =
    kind === "image" ? "image optimization credits" : kind === "cmsWrite" ? "layout saves" : "Designer API requests";
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
