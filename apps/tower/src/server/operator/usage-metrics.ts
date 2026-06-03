import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { utcYearMonth } from "@/server/billing/metering-policy";
import type {
  OperatorUsageConsumer,
  OperatorUsageCostSegment,
  OperatorUsageCostTrendPoint,
  OperatorUsageLimitsView,
  OperatorUsageMeterCost,
  OperatorUsageMeterTotals,
  OperatorUsageMetrics,
  OperatorUsageSegmentTotals,
  OperatorUsageTrendPoint,
  OperatorUsageUtilizationMeter,
} from "@/server/operator/types";
import { fetchOperatorUserUsageLimits, fetchOperatorWorkspaceUsageLimits } from "@/server/operator/usage-limits";
import { db } from "@/shared/lib/db";
import { organization, towerUsageMonth, towerWorkspaceUsageMonth, user } from "@/shared/lib/db/auth-schema";
import { meterCostUsd } from "@/shared/lib/infra-cost-model";

const TREND_MONTHS = 12;
const TOP_CONSUMERS_LIMIT = 8;

const EMPTY_COST: OperatorUsageMeterCost = { webflowProxy: 0, cmsWrite: 0, image: 0 };

/** Measured cost-driver sums (one month / entity) used to derive per-meter USD cost. */
type MeterCostDrivers = {
  webflowProxyComputeMs: number;
  webflowProxyEgressBytes: number;
  cmsWriteComputeMs: number;
  cmsWriteEgressBytes: number;
  imageComputeMs: number;
  imageEgressBytes: number;
};

/** Prices measured drivers into per-meter USD cost (single source of truth: `infra-cost-model`). */
function costFromDrivers(d: MeterCostDrivers): OperatorUsageMeterCost {
  return {
    webflowProxy: meterCostUsd(d.webflowProxyComputeMs, d.webflowProxyEgressBytes),
    cmsWrite: meterCostUsd(d.cmsWriteComputeMs, d.cmsWriteEgressBytes),
    image: meterCostUsd(d.imageComputeMs, d.imageEgressBytes),
  };
}

/** Cost is linear in drivers, so summing per-table costs equals costing the combined drivers. */
function addCost(a: OperatorUsageMeterCost, b: OperatorUsageMeterCost): OperatorUsageMeterCost {
  return {
    webflowProxy: a.webflowProxy + b.webflowProxy,
    cmsWrite: a.cmsWrite + b.cmsWrite,
    image: a.image + b.image,
  };
}

const EMPTY_TOTALS: OperatorUsageMeterTotals = {
  webflowProxyRequestCount: 0,
  cmsWriteCount: 0,
  imageOptimizeCount: 0,
};

/** Trailing `count` calendar months (UTC) ending with the current month, ascending. */
function recentYearMonths(count: number, now = new Date()): string[] {
  const months: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    months.push(utcYearMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1))));
  }
  return months;
}

function addTotals(target: OperatorUsageMeterTotals, source: OperatorUsageMeterTotals): void {
  target.webflowProxyRequestCount += source.webflowProxyRequestCount;
  target.cmsWriteCount += source.cmsWriteCount;
  target.imageOptimizeCount += source.imageOptimizeCount;
}

type MeterTotalsTable = typeof towerUsageMonth | typeof towerWorkspaceUsageMonth;

/** Sum each meter per `yearMonth` for the given table, restricted to the requested month window. */
async function aggregateMonthlyTotals(
  table: MeterTotalsTable,
  months: string[]
): Promise<Map<string, OperatorUsageMeterTotals>> {
  const rows = await db
    .select({
      yearMonth: table.yearMonth,
      webflowProxyRequestCount: sql<number>`COALESCE(SUM(${table.webflowProxyRequestCount}), 0)`,
      cmsWriteCount: sql<number>`COALESCE(SUM(${table.cmsWriteCount}), 0)`,
      imageOptimizeCount: sql<number>`COALESCE(SUM(${table.imageOptimizeCount}), 0)`,
    })
    .from(table)
    .where(inArray(table.yearMonth, months))
    .groupBy(table.yearMonth);

  const byMonth = new Map<string, OperatorUsageMeterTotals>();
  for (const row of rows) {
    byMonth.set(row.yearMonth, {
      webflowProxyRequestCount: Number(row.webflowProxyRequestCount ?? 0),
      cmsWriteCount: Number(row.cmsWriteCount ?? 0),
      imageOptimizeCount: Number(row.imageOptimizeCount ?? 0),
    });
  }
  return byMonth;
}

/** Sum each meter's measured cost drivers per `yearMonth`, then price them into per-meter USD cost. */
async function aggregateMonthlyCost(
  table: MeterTotalsTable,
  months: string[]
): Promise<Map<string, OperatorUsageMeterCost>> {
  const rows = await db
    .select({
      yearMonth: table.yearMonth,
      webflowProxyComputeMs: sql<number>`COALESCE(SUM(${table.webflowProxyComputeMs}), 0)`,
      webflowProxyEgressBytes: sql<number>`COALESCE(SUM(${table.webflowProxyEgressBytes}), 0)`,
      cmsWriteComputeMs: sql<number>`COALESCE(SUM(${table.cmsWriteComputeMs}), 0)`,
      cmsWriteEgressBytes: sql<number>`COALESCE(SUM(${table.cmsWriteEgressBytes}), 0)`,
      imageComputeMs: sql<number>`COALESCE(SUM(${table.imageComputeMs}), 0)`,
      imageEgressBytes: sql<number>`COALESCE(SUM(${table.imageEgressBytes}), 0)`,
    })
    .from(table)
    .where(inArray(table.yearMonth, months))
    .groupBy(table.yearMonth);

  const byMonth = new Map<string, OperatorUsageMeterCost>();
  for (const row of rows) {
    byMonth.set(
      row.yearMonth,
      costFromDrivers({
        webflowProxyComputeMs: Number(row.webflowProxyComputeMs ?? 0),
        webflowProxyEgressBytes: Number(row.webflowProxyEgressBytes ?? 0),
        cmsWriteComputeMs: Number(row.cmsWriteComputeMs ?? 0),
        cmsWriteEgressBytes: Number(row.cmsWriteEgressBytes ?? 0),
        imageComputeMs: Number(row.imageComputeMs ?? 0),
        imageEgressBytes: Number(row.imageEgressBytes ?? 0),
      })
    );
  }
  return byMonth;
}

async function fetchDesignerApiBreakdown(yearMonth: string): Promise<{ cmsSlots: number; imageUploadCms: number }> {
  const [userRow, workspaceRow] = await Promise.all([
    db
      .select({
        cmsSlots: sql<number>`COALESCE(SUM(${towerUsageMonth.webflowProxyCmsSlotsCount}), 0)`,
        imageUploadCms: sql<number>`COALESCE(SUM(${towerUsageMonth.webflowProxyImageUploadCmsCount}), 0)`,
      })
      .from(towerUsageMonth)
      .where(eq(towerUsageMonth.yearMonth, yearMonth)),
    db
      .select({
        cmsSlots: sql<number>`COALESCE(SUM(${towerWorkspaceUsageMonth.webflowProxyCmsSlotsCount}), 0)`,
        imageUploadCms: sql<number>`COALESCE(SUM(${towerWorkspaceUsageMonth.webflowProxyImageUploadCmsCount}), 0)`,
      })
      .from(towerWorkspaceUsageMonth)
      .where(eq(towerWorkspaceUsageMonth.yearMonth, yearMonth)),
  ]);
  return {
    cmsSlots: Number(userRow[0]?.cmsSlots ?? 0) + Number(workspaceRow[0]?.cmsSlots ?? 0),
    imageUploadCms: Number(userRow[0]?.imageUploadCms ?? 0) + Number(workspaceRow[0]?.imageUploadCms ?? 0),
  };
}

async function fetchTopUserConsumers(yearMonth: string): Promise<OperatorUsageConsumer[]> {
  const total = sql<number>`(${towerUsageMonth.webflowProxyRequestCount} + ${towerUsageMonth.cmsWriteCount} + ${towerUsageMonth.imageOptimizeCount})`;
  const rows = await db
    .select({
      id: towerUsageMonth.userId,
      email: user.email,
      name: user.name,
      webflowProxyRequestCount: towerUsageMonth.webflowProxyRequestCount,
      cmsWriteCount: towerUsageMonth.cmsWriteCount,
      imageOptimizeCount: towerUsageMonth.imageOptimizeCount,
      webflowProxyComputeMs: towerUsageMonth.webflowProxyComputeMs,
      webflowProxyEgressBytes: towerUsageMonth.webflowProxyEgressBytes,
      cmsWriteComputeMs: towerUsageMonth.cmsWriteComputeMs,
      cmsWriteEgressBytes: towerUsageMonth.cmsWriteEgressBytes,
      imageComputeMs: towerUsageMonth.imageComputeMs,
      imageEgressBytes: towerUsageMonth.imageEgressBytes,
      total,
    })
    .from(towerUsageMonth)
    .innerJoin(user, eq(user.id, towerUsageMonth.userId))
    .where(eq(towerUsageMonth.yearMonth, yearMonth))
    .orderBy(desc(total))
    .limit(TOP_CONSUMERS_LIMIT);

  return rows
    .filter((row) => Number(row.total) > 0)
    .map((row) => ({
      id: row.id,
      scope: "user" as const,
      label: row.email,
      sublabel: row.name || row.email,
      webflowProxyRequestCount: row.webflowProxyRequestCount,
      cmsWriteCount: row.cmsWriteCount,
      imageOptimizeCount: row.imageOptimizeCount,
      total: Number(row.total),
      cost: costFromDrivers(row),
    }));
}

async function fetchTopWorkspaceConsumers(yearMonth: string): Promise<OperatorUsageConsumer[]> {
  const total = sql<number>`(${towerWorkspaceUsageMonth.webflowProxyRequestCount} + ${towerWorkspaceUsageMonth.cmsWriteCount} + ${towerWorkspaceUsageMonth.imageOptimizeCount})`;
  const rows = await db
    .select({
      id: towerWorkspaceUsageMonth.organizationId,
      name: organization.name,
      slug: organization.slug,
      webflowProxyRequestCount: towerWorkspaceUsageMonth.webflowProxyRequestCount,
      cmsWriteCount: towerWorkspaceUsageMonth.cmsWriteCount,
      imageOptimizeCount: towerWorkspaceUsageMonth.imageOptimizeCount,
      webflowProxyComputeMs: towerWorkspaceUsageMonth.webflowProxyComputeMs,
      webflowProxyEgressBytes: towerWorkspaceUsageMonth.webflowProxyEgressBytes,
      cmsWriteComputeMs: towerWorkspaceUsageMonth.cmsWriteComputeMs,
      cmsWriteEgressBytes: towerWorkspaceUsageMonth.cmsWriteEgressBytes,
      imageComputeMs: towerWorkspaceUsageMonth.imageComputeMs,
      imageEgressBytes: towerWorkspaceUsageMonth.imageEgressBytes,
      total,
    })
    .from(towerWorkspaceUsageMonth)
    .innerJoin(organization, eq(organization.id, towerWorkspaceUsageMonth.organizationId))
    .where(eq(towerWorkspaceUsageMonth.yearMonth, yearMonth))
    .orderBy(desc(total))
    .limit(TOP_CONSUMERS_LIMIT);

  return rows
    .filter((row) => Number(row.total) > 0)
    .map((row) => ({
      id: row.id,
      scope: "workspace" as const,
      label: row.name,
      sublabel: row.slug,
      webflowProxyRequestCount: row.webflowProxyRequestCount,
      cmsWriteCount: row.cmsWriteCount,
      imageOptimizeCount: row.imageOptimizeCount,
      total: Number(row.total),
      cost: costFromDrivers(row),
    }));
}

const UTILIZATION_METERS = [
  { kind: "webflowProxy", count: "webflowProxyRequestCount", cap: "effectiveWebflowProxyLimit" },
  { kind: "cmsWrite", count: "cmsWriteCount", cap: "effectiveCmsWriteLimit" },
  { kind: "image", count: "imageOptimizeCount", cap: "effectiveImageLimit" },
] as const;

/**
 * Peak single-account utilization per meter: the most-utilized metered entity (highest used/cap ratio)
 * among the accounts that consumed this month. This is the actionable capacity signal — "how close is
 * the busiest account to its cap?" — rather than a platform-wide sum, which stays ~0% until huge scale.
 * Caps come from the same per-entity policy resolver used for enforcement. Unmetered entities (null or
 * non-positive cap) are excluded so the ratio stays meaningful.
 */
async function fetchUtilization(yearMonth: string): Promise<OperatorUsageUtilizationMeter[]> {
  const activeTotal = (table: MeterTotalsTable) =>
    sql<number>`(${table.webflowProxyRequestCount} + ${table.cmsWriteCount} + ${table.imageOptimizeCount})`;

  const [userIdRows, orgIdRows] = await Promise.all([
    db
      .select({ id: towerUsageMonth.userId })
      .from(towerUsageMonth)
      .where(and(eq(towerUsageMonth.yearMonth, yearMonth), sql`${activeTotal(towerUsageMonth)} > 0`)),
    db
      .select({ id: towerWorkspaceUsageMonth.organizationId })
      .from(towerWorkspaceUsageMonth)
      .where(and(eq(towerWorkspaceUsageMonth.yearMonth, yearMonth), sql`${activeTotal(towerWorkspaceUsageMonth)} > 0`)),
  ]);

  const [userViews, workspaceViews] = await Promise.all([
    Promise.all(
      userIdRows.map(async (row) => ({
        id: row.id,
        scope: "user" as const,
        view: await fetchOperatorUserUsageLimits(row.id),
      }))
    ),
    Promise.all(
      orgIdRows.map(async (row) => ({
        id: row.id,
        scope: "workspace" as const,
        view: await fetchOperatorWorkspaceUsageLimits(row.id),
      }))
    ),
  ]);

  const entities: UtilizationEntity[] = [...userViews, ...workspaceViews].flatMap((entry) =>
    entry.view ? [{ id: entry.id, scope: entry.scope, view: entry.view }] : []
  );

  const peaks = UTILIZATION_METERS.map((meter) => {
    let used = 0;
    let limit = 0;
    let peakRatio = -1;
    let meteredEntityCount = 0;
    let peak: UtilizationEntity | null = null;
    for (const entity of entities) {
      const cap = entity.view[meter.cap];
      if (cap === null || cap <= 0) {
        continue;
      }
      meteredEntityCount += 1;
      const entityUsed = entity.view[meter.count];
      const ratio = entityUsed / cap;
      if (ratio > peakRatio) {
        peakRatio = ratio;
        used = entityUsed;
        limit = cap;
        peak = entity;
      }
    }
    return { kind: meter.kind, used, limit, meteredEntityCount, peak };
  });

  const peakLabels = await resolvePeakLabels(peaks);
  return peaks.map(({ peak, ...meter }) => ({
    ...meter,
    peakLabel: peak ? (peakLabels.get(`${peak.scope}:${peak.id}`) ?? null) : null,
  }));
}

/** A metered entity (individual user or pooled workspace) paired with its resolved limits view. */
type UtilizationEntity = { id: string; scope: "user" | "workspace"; view: OperatorUsageLimitsView };

/** Resolves a display label (user email / workspace name) for each meter's peak entity, in one batch. */
async function resolvePeakLabels(
  peaks: ReadonlyArray<{ peak: { id: string; scope: "user" | "workspace" } | null }>
): Promise<Map<string, string>> {
  const userIds = [...new Set(peaks.flatMap((entry) => (entry.peak?.scope === "user" ? [entry.peak.id] : [])))];
  const orgIds = [...new Set(peaks.flatMap((entry) => (entry.peak?.scope === "workspace" ? [entry.peak.id] : [])))];

  const [userRows, orgRows] = await Promise.all([
    userIds.length > 0
      ? db.select({ id: user.id, email: user.email, name: user.name }).from(user).where(inArray(user.id, userIds))
      : Promise.resolve([]),
    orgIds.length > 0
      ? db
          .select({ id: organization.id, name: organization.name })
          .from(organization)
          .where(inArray(organization.id, orgIds))
      : Promise.resolve([]),
  ]);

  const labels = new Map<string, string>();
  for (const row of userRows) {
    labels.set(`user:${row.id}`, row.email || row.name || row.id);
  }
  for (const row of orgRows) {
    labels.set(`workspace:${row.id}`, row.name || row.id);
  }
  return labels;
}

export async function fetchOperatorUsageMetrics(): Promise<OperatorUsageMetrics> {
  const months = recentYearMonths(TREND_MONTHS);
  const currentMonth = months[months.length - 1];

  const [
    userByMonth,
    workspaceByMonth,
    userCostByMonth,
    workspaceCostByMonth,
    designerApiBreakdown,
    userConsumers,
    workspaceConsumers,
    utilization,
  ] = await Promise.all([
    aggregateMonthlyTotals(towerUsageMonth, months),
    aggregateMonthlyTotals(towerWorkspaceUsageMonth, months),
    aggregateMonthlyCost(towerUsageMonth, months),
    aggregateMonthlyCost(towerWorkspaceUsageMonth, months),
    fetchDesignerApiBreakdown(currentMonth),
    fetchTopUserConsumers(currentMonth),
    fetchTopWorkspaceConsumers(currentMonth),
    fetchUtilization(currentMonth),
  ]);

  const trend: OperatorUsageTrendPoint[] = months.map((yearMonth) => {
    const point: OperatorUsageTrendPoint = { yearMonth, ...EMPTY_TOTALS };
    const userTotals = userByMonth.get(yearMonth);
    const workspaceTotals = workspaceByMonth.get(yearMonth);
    if (userTotals) {
      addTotals(point, userTotals);
    }
    if (workspaceTotals) {
      addTotals(point, workspaceTotals);
    }
    return point;
  });

  const currentMonthTotals: OperatorUsageMeterTotals = {
    ...EMPTY_TOTALS,
  };
  const currentTrendPoint = trend[trend.length - 1];
  addTotals(currentMonthTotals, {
    webflowProxyRequestCount: currentTrendPoint.webflowProxyRequestCount,
    cmsWriteCount: currentTrendPoint.cmsWriteCount,
    imageOptimizeCount: currentTrendPoint.imageOptimizeCount,
  });

  const segments: OperatorUsageSegmentTotals[] = [
    { segment: "individual", ...(userByMonth.get(currentMonth) ?? EMPTY_TOTALS) },
    { segment: "workspace", ...(workspaceByMonth.get(currentMonth) ?? EMPTY_TOTALS) },
  ];

  const costTrend: OperatorUsageCostTrendPoint[] = months.map((yearMonth) => ({
    yearMonth,
    ...addCost(userCostByMonth.get(yearMonth) ?? EMPTY_COST, workspaceCostByMonth.get(yearMonth) ?? EMPTY_COST),
  }));

  const individualCost = userCostByMonth.get(currentMonth) ?? EMPTY_COST;
  const workspaceCost = workspaceCostByMonth.get(currentMonth) ?? EMPTY_COST;
  const currentMonthCost = addCost(individualCost, workspaceCost);
  const costSegments: OperatorUsageCostSegment[] = [
    { segment: "individual", ...individualCost },
    { segment: "workspace", ...workspaceCost },
  ];

  const topConsumers = [...userConsumers, ...workspaceConsumers]
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_CONSUMERS_LIMIT);

  return {
    yearMonth: currentMonth,
    currentMonthTotals,
    currentMonthCost,
    designerApiBreakdown,
    trend,
    costTrend,
    segments,
    costSegments,
    topConsumers,
    utilization,
  };
}

/** Per-entity monthly usage series (last `TREND_MONTHS`), zero-filled for months with no row. */
export async function fetchOperatorUsageTrend(
  scope: "user" | "workspace",
  id: string
): Promise<OperatorUsageTrendPoint[]> {
  const months = recentYearMonths(TREND_MONTHS);
  const table = scope === "user" ? towerUsageMonth : towerWorkspaceUsageMonth;
  const idColumn = scope === "user" ? towerUsageMonth.userId : towerWorkspaceUsageMonth.organizationId;

  const rows = await db
    .select({
      yearMonth: table.yearMonth,
      webflowProxyRequestCount: table.webflowProxyRequestCount,
      cmsWriteCount: table.cmsWriteCount,
      imageOptimizeCount: table.imageOptimizeCount,
    })
    .from(table)
    .where(eq(idColumn, id));

  const byMonth = new Map(rows.map((row) => [row.yearMonth, row]));
  return months.map((yearMonth) => {
    const row = byMonth.get(yearMonth);
    return {
      yearMonth,
      webflowProxyRequestCount: row?.webflowProxyRequestCount ?? 0,
      cmsWriteCount: row?.cmsWriteCount ?? 0,
      imageOptimizeCount: row?.imageOptimizeCount ?? 0,
    };
  });
}
