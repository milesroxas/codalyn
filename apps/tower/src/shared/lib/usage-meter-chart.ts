import { TOWER_USAGE_METER_KINDS, type TowerUsageMeterKind, towerUsageMeterLabel } from "@codalyn/webflow-kit";
import type { OperatorUsageMeterTotals } from "@/server/operator/types";
import type { ChartConfig } from "@/shared/ui/chart";

/**
 * Single source of truth for usage-meter chart presentation (data keys, labels, colors). Every operator
 * usage chart imports from here so a meter's label/color is defined exactly once. Labels reuse the
 * canonical `towerUsageMeterLabel` from `@codalyn/webflow-kit`.
 */

export const USAGE_METER_KINDS = TOWER_USAGE_METER_KINDS;

/** The `OperatorUsageMeterTotals` field that stores a given meter's count. */
export const USAGE_METER_COUNT_KEY: Record<TowerUsageMeterKind, keyof OperatorUsageMeterTotals> = {
  webflowProxy: "webflowProxyRequestCount",
  cmsWrite: "cmsWriteCount",
  image: "imageOptimizeCount",
};

const USAGE_METER_COLOR: Record<TowerUsageMeterKind, string> = {
  webflowProxy: "var(--chart-1)",
  cmsWrite: "var(--chart-2)",
  image: "var(--chart-3)",
};

/** Chart config keyed by the count field, so chart `dataKey`s resolve `--color-<key>` directly. */
export const USAGE_METER_CHART_CONFIG: ChartConfig = USAGE_METER_KINDS.reduce<ChartConfig>((config, kind) => {
  config[USAGE_METER_COUNT_KEY[kind]] = {
    label: towerUsageMeterLabel(kind),
    color: USAGE_METER_COLOR[kind],
  };
  return config;
}, {});

export function usageMeterLabel(kind: TowerUsageMeterKind): string {
  return towerUsageMeterLabel(kind);
}

export function usageMeterColor(kind: TowerUsageMeterKind): string {
  return USAGE_METER_COLOR[kind];
}

/** Designer API (Webflow updates) sub-breakdown slices. */
export const DESIGNER_API_CHART_CONFIG: ChartConfig = {
  cmsSlots: { label: "CMS Slots", color: "var(--chart-2)" },
  imageUploadCms: { label: "Image Upload", color: "var(--chart-4)" },
};

/** Where current-month usage is metered: per individual account vs pooled across a workspace. */
export const USAGE_SEGMENT_CHART_CONFIG: ChartConfig = {
  individual: { label: "Individual", color: "var(--chart-2)" },
  workspace: { label: "Team pools", color: "var(--chart-4)" },
};

const compactNumber = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const fullNumber = new Intl.NumberFormat();

export function formatUsageCompact(value: number): string {
  return compactNumber.format(value);
}

export function formatUsageFull(value: number): string {
  return fullNumber.format(value);
}

/** `YYYY-MM` → short month axis label (e.g. `Jun`), using day 1 UTC to avoid TZ drift. */
export function formatYearMonthShort(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) {
    return yearMonth;
  }
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: "short",
    timeZone: "UTC",
  });
}

/** `YYYY-MM` → full month + year label for tooltips (e.g. `June 2026`). */
export function formatYearMonthLong(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) {
    return yearMonth;
  }
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
