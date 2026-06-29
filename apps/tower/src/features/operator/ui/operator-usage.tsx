"use client";

import { towerPlanName } from "@codalyn/webflow-kit";
import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { IconBolt, IconCoin, IconDeviceFloppy, IconPhoto, IconRefresh } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import type {
  OperatorUsageMeterCost,
  OperatorUsageMeterTotals,
  OperatorUsageMetrics,
  OperatorUsageSegmentTotals,
  OperatorUsageTierEconomics,
} from "@/server/operator/types";
import { formatUsd, formatUsdCompact, RATE_ANCHORS } from "@/shared/lib/infra-cost-model";
import {
  DESIGNER_API_CHART_CONFIG,
  formatUsageFull,
  formatYearMonthLong,
  USAGE_METER_COUNT_KEY,
  USAGE_METER_KINDS,
  usageMeterColor,
  usageMeterLabel,
} from "@/shared/lib/usage-meter-chart";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { StatTile } from "@/shared/ui/stat-tile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { UsageCompositionChart } from "@/shared/ui/usage-composition-chart";
import { UsageRankedBarChart } from "@/shared/ui/usage-ranked-bar-chart";
import { UsageSegmentChart } from "@/shared/ui/usage-segment-chart";
import { UsageTrendChart } from "@/shared/ui/usage-trend-chart";
import { UsageUtilizationChart } from "@/shared/ui/usage-utilization-chart";

const METER_ICONS = {
  webflowProxy: IconBolt,
  cmsWrite: IconDeviceFloppy,
  image: IconPhoto,
} as const;

/** Whether the dashboard shows raw metered counts or their estimated infra cost in USD. */
type UsageUnit = "count" | "cost";

/** Re-key per-meter cost (keyed by meter kind) onto the meter-count fields the charts render. */
function costToMeterKeyed(cost: OperatorUsageMeterCost): OperatorUsageMeterTotals {
  return {
    webflowProxyRequestCount: cost.webflowProxy,
    cmsWriteCount: cost.cmsWrite,
    imageOptimizeCount: cost.image,
  };
}

function sumCost(cost: OperatorUsageMeterCost): number {
  return cost.webflowProxy + cost.cmsWrite + cost.image;
}

const PERCENT_FORMAT = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 });

function formatRatio(value: number): string {
  return PERCENT_FORMAT.format(Number.isFinite(value) ? value : 0);
}

type UsageCardProps = {
  metrics: OperatorUsageMetrics | null;
  loading: boolean;
  unit: UsageUnit;
};

export function OperatorUsage() {
  const [metrics, setMetrics] = useState<OperatorUsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<UsageUnit>("count");

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setMetrics(await operatorApi.usageMetrics());
    } catch (err) {
      setError(err instanceof OperatorApiError ? err.message : "Could not load usage metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Operator</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Usage &amp; metering</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Platform-wide metered consumption and the estimated Vercel + Neon cost it drives. Switch to Cost to see unit
            economics and which accounts are most expensive to serve.
            {metrics ? (
              <span className="mt-1 block text-xs text-muted-foreground/90">
                Reporting period: {formatYearMonthLong(metrics.yearMonth)} (UTC)
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={unit}
            onValueChange={(value) => {
              if (value === "count" || value === "cost") {
                setUnit(value);
              }
            }}
            variant="outline"
            size="sm"
            aria-label="Value unit"
          >
            <ToggleGroupItem value="count">Usage</ToggleGroupItem>
            <ToggleGroupItem value="cost">Cost</ToggleGroupItem>
          </ToggleGroup>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="gap-1.5"
          >
            <IconRefresh className={loading ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <CurrentMonthStats metrics={metrics} loading={loading} unit={unit} />
      <TrendCard metrics={metrics} loading={loading} unit={unit} />
      <TierEconomicsCard metrics={metrics} loading={loading} />

      <div className="grid gap-4 lg:grid-cols-2">
        {unit === "cost" ? (
          <UnitEconomicsCard metrics={metrics} loading={loading} unit={unit} />
        ) : (
          <DesignerApiCard metrics={metrics} loading={loading} unit={unit} />
        )}
        <UtilizationCard metrics={metrics} loading={loading} unit={unit} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SegmentCard metrics={metrics} loading={loading} unit={unit} />
        <TopConsumersCard metrics={metrics} loading={loading} unit={unit} />
      </div>
    </div>
  );
}

function ChartSkeleton({ height }: { height: number }) {
  return <Skeleton className="w-full" style={{ height }} />;
}

function CurrentMonthStats({ metrics, loading, unit }: UsageCardProps) {
  const showPlaceholder = useDeferredLoadingIndicator(loading);
  const skeletonKeys = unit === "cost" ? (["total", ...USAGE_METER_KINDS] as const) : USAGE_METER_KINDS;
  if (showPlaceholder) {
    return (
      <div className={unit === "cost" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-3 sm:grid-cols-3"}>
        {skeletonKeys.map((key) => (
          <Card key={key} size="sm">
            <CardContent className="space-y-2 pt-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  if (!metrics) {
    return null;
  }
  if (unit === "cost") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Estimated infra cost"
          value={formatUsd(sumCost(metrics.currentMonthCost))}
          caption="This month, platform-wide"
          icon={IconCoin}
          tone="positive"
        />
        {USAGE_METER_KINDS.map((kind) => (
          <StatTile
            key={kind}
            label={usageMeterLabel(kind)}
            value={formatUsd(metrics.currentMonthCost[kind])}
            caption="Estimated this month"
            icon={METER_ICONS[kind]}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {USAGE_METER_KINDS.map((kind) => (
        <StatTile
          key={kind}
          label={usageMeterLabel(kind)}
          value={formatUsageFull(metrics.currentMonthTotals[USAGE_METER_COUNT_KEY[kind]])}
          caption="This month, platform-wide"
          icon={METER_ICONS[kind]}
        />
      ))}
    </div>
  );
}

function TrendCard({ metrics, loading, unit }: UsageCardProps) {
  const showPlaceholder = useDeferredLoadingIndicator(loading);
  const isCost = unit === "cost";
  const data = useMemo(() => {
    if (!metrics) {
      return [];
    }
    return isCost
      ? metrics.costTrend.map((point) => ({ yearMonth: point.yearMonth, ...costToMeterKeyed(point) }))
      : metrics.trend;
  }, [metrics, isCost]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{isCost ? "Estimated infra cost trend" : "Monthly usage trend"}</CardTitle>
        <CardDescription>
          {isCost
            ? "Estimated Vercel + Neon cost per meter over the last 12 months."
            : "Metered consumption per meter over the last 12 months."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showPlaceholder || !metrics ? (
          <ChartSkeleton height={260} />
        ) : (
          <UsageTrendChart
            data={data}
            valueFormatter={isCost ? formatUsd : undefined}
            compactFormatter={isCost ? formatUsdCompact : undefined}
          />
        )}
      </CardContent>
    </Card>
  );
}

function DesignerApiCard({ metrics, loading }: UsageCardProps) {
  const showPlaceholder = useDeferredLoadingIndicator(loading);
  const slices = useMemo(
    () =>
      metrics
        ? [
            { key: "cmsSlots", value: metrics.designerApiBreakdown.cmsSlots },
            { key: "imageUploadCms", value: metrics.designerApiBreakdown.imageUploadCms },
          ]
        : [],
    [metrics]
  );
  const hasData = slices.some((slice) => slice.value > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Webflow updates breakdown</CardTitle>
        <CardDescription>What drives Designer API requests this month.</CardDescription>
      </CardHeader>
      <CardContent>
        {showPlaceholder || !metrics ? (
          <ChartSkeleton height={220} />
        ) : hasData ? (
          <UsageCompositionChart data={slices} config={DESIGNER_API_CHART_CONFIG} centerLabel="requests" />
        ) : (
          <EmptyChartNote>No Webflow update activity this month.</EmptyChartNote>
        )}
      </CardContent>
    </Card>
  );
}

function UnitEconomicsCard({ metrics, loading }: UsageCardProps) {
  const showPlaceholder = useDeferredLoadingIndicator(loading);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Unit economics</CardTitle>
        <CardDescription>
          Measured infra cost to serve 1,000 units of each meter this month — the lever for caps and pricing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showPlaceholder || !metrics ? (
          <ChartSkeleton height={220} />
        ) : (
          <div className="space-y-4">
            <dl className="divide-y divide-border">
              {USAGE_METER_KINDS.map((kind) => {
                const count = metrics.currentMonthTotals[USAGE_METER_COUNT_KEY[kind]];
                const perThousand = count > 0 ? (metrics.currentMonthCost[kind] / count) * 1000 : null;
                return (
                  <div key={kind} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <dt className="flex items-center gap-2 text-sm text-foreground">
                      <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: usageMeterColor(kind) }} />
                      {usageMeterLabel(kind)}
                    </dt>
                    <dd className="font-mono text-sm font-medium tabular-nums text-foreground">
                      {perThousand === null ? (
                        <span className="text-muted-foreground">No data yet</span>
                      ) : (
                        <>
                          {formatUsd(perThousand)}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">/ 1K</span>
                        </>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Estimates, not billed amounts. Measured active compute priced at Vercel CPU ( $
              {RATE_ANCHORS.vercelActiveCpuUsdPerHour}/CPU-hr) + memory and egress at Fast Data Transfer ( $
              {RATE_ANCHORS.vercelFastDataTransferUsdPerGb}/GB). Excludes fixed per-invocation and Neon overhead.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Average cost to serve one account in a tier this month. */
function avgCostPerAccount(tier: OperatorUsageTierEconomics): number {
  return tier.population > 0 ? sumCost(tier.cost) / tier.population : 0;
}

/**
 * Tier usage vs the standard plan cap for one meter. Team rows use pooled capacity (total used ÷ total
 * allocated). Individual plans use average utilization among accounts that consumed this month so
 * inactive accounts do not dilute the signal.
 */
function tierMeterUtilization(
  tier: OperatorUsageTierEconomics,
  kind: (typeof USAGE_METER_KINDS)[number]
): number | null {
  const countKey = USAGE_METER_COUNT_KEY[kind];
  const capTotal = tier.capTotals[countKey];
  if (capTotal <= 0) {
    return null;
  }
  if (tier.scope === "workspace") {
    return tier.totals[countKey] / capTotal;
  }
  if (tier.activeCount <= 0 || tier.population <= 0) {
    return null;
  }
  const perAccountCap = capTotal / tier.population;
  if (perAccountCap <= 0) {
    return null;
  }
  return tier.totals[countKey] / tier.activeCount / perAccountCap;
}

function TierEconomicsCard({ metrics, loading }: { metrics: OperatorUsageMetrics | null; loading: boolean }) {
  const showPlaceholder = useDeferredLoadingIndicator(loading);
  const totalCost = useMemo(
    () => (metrics ? metrics.tiers.reduce((sum, tier) => sum + sumCost(tier.cost), 0) : 0),
    [metrics]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Economics by plan</CardTitle>
        <CardDescription>
          Population, estimated infra cost to serve, and usage against each plan&apos;s standard cap — the basis for
          pricing and limit decisions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showPlaceholder || !metrics ? (
          <ChartSkeleton height={220} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Cost / account</TableHead>
                <TableHead className="text-right">Total cost</TableHead>
                <TableHead className="text-right">Share</TableHead>
                {USAGE_METER_KINDS.map((kind) => (
                  <TableHead key={kind} className="text-right">
                    {usageMeterLabel(kind)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.tiers.map((tier) => {
                const cost = sumCost(tier.cost);
                return (
                  <TableRow key={tier.tier}>
                    <TableCell className="font-medium text-foreground">{towerPlanName(tier.tier)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsageFull(tier.population)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatUsageFull(tier.activeCount)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatUsd(avgCostPerAccount(tier))}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatUsd(cost)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {totalCost > 0 ? formatRatio(cost / totalCost) : "—"}
                    </TableCell>
                    {USAGE_METER_KINDS.map((kind) => {
                      const countKey = USAGE_METER_COUNT_KEY[kind];
                      const used = tier.totals[countKey];
                      const util = tierMeterUtilization(tier, kind);
                      return (
                        <TableCell key={kind} className="text-right">
                          <div className="font-mono tabular-nums text-foreground">{formatUsageFull(used)}</div>
                          {util === null ? (
                            <div className="text-xs text-muted-foreground">—</div>
                          ) : (
                            <div className="text-xs tabular-nums text-muted-foreground">{formatRatio(util)} of cap</div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Cost is the measured infra estimate attributed to each plan. Meter columns show platform totals this month;
          the percentage is active-account average vs the standard per-account cap for Free/Pro/Studio, or total pooled
          usage vs allocated Team capacity (per-seat cap × paid seats). Operator overrides are excluded.
        </p>
      </CardContent>
    </Card>
  );
}

function UtilizationCard({ metrics, loading }: UsageCardProps) {
  const showPlaceholder = useDeferredLoadingIndicator(loading);
  const hasData = metrics?.utilization.some((meter) => meter.limit > 0) ?? false;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Capacity utilization</CardTitle>
        <CardDescription>
          Busiest account per meter — how close the most-utilized account is to its cap.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showPlaceholder || !metrics ? (
          <ChartSkeleton height={220} />
        ) : hasData ? (
          <UsageUtilizationChart data={metrics.utilization} />
        ) : (
          <EmptyChartNote>No metered consumption to measure yet.</EmptyChartNote>
        )}
      </CardContent>
    </Card>
  );
}

function SegmentCard({ metrics, loading, unit }: UsageCardProps) {
  const showPlaceholder = useDeferredLoadingIndicator(loading);
  const isCost = unit === "cost";
  const segments = useMemo<OperatorUsageSegmentTotals[]>(() => {
    if (!metrics) {
      return [];
    }
    return isCost
      ? metrics.costSegments.map((segment) => ({ segment: segment.segment, ...costToMeterKeyed(segment) }))
      : metrics.segments;
  }, [metrics, isCost]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Individual vs team pools</CardTitle>
        <CardDescription>
          {isCost
            ? "Where this month's estimated cost is metered, per meter."
            : "Where this month's usage is metered, per meter."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showPlaceholder || !metrics ? (
          <ChartSkeleton height={240} />
        ) : (
          <UsageSegmentChart
            segments={segments}
            valueFormatter={isCost ? formatUsd : undefined}
            compactFormatter={isCost ? formatUsdCompact : undefined}
          />
        )}
      </CardContent>
    </Card>
  );
}

function TopConsumersCard({ metrics, loading, unit }: UsageCardProps) {
  const router = useRouter();
  const showPlaceholder = useDeferredLoadingIndicator(loading);
  const [meterKind, setMeterKind] = useState<(typeof USAGE_METER_KINDS)[number]>("webflowProxy");
  const isCost = unit === "cost";

  const data = useMemo(() => {
    if (!metrics) {
      return [];
    }
    const countKey = USAGE_METER_COUNT_KEY[meterKind];
    return metrics.topConsumers
      .map((consumer) => ({
        id: consumer.id,
        label: consumer.label,
        sublabel: consumer.sublabel,
        scope: consumer.scope,
        value: isCost ? consumer.cost[meterKind] : consumer[countKey],
        consumer,
      }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [metrics, meterKind, isCost]);

  const onSelect = useCallback(
    (datum: { id: string }) => {
      const consumer = data.find((row) => row.id === datum.id)?.consumer;
      if (!consumer) {
        return;
      }
      const path = consumer.scope === "workspace" ? "/console/workspaces" : "/console/customers";
      router.push(`${path}?id=${encodeURIComponent(consumer.id)}`);
    },
    [data, router]
  );

  const meterLabel = usageMeterLabel(meterKind);
  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-sm">Top consumers</CardTitle>
          <CardDescription>
            {isCost
              ? "Most expensive to serve this month. Select to open the account."
              : "Highest usage this month. Select to open the account."}
          </CardDescription>
        </div>
        <Select value={meterKind} onValueChange={(value) => setMeterKind(value as (typeof USAGE_METER_KINDS)[number])}>
          <SelectTrigger size="sm" width="filter" aria-label="Meter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {USAGE_METER_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {usageMeterLabel(kind)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <TopConsumersBody
          ready={!showPlaceholder && metrics !== null}
          data={data}
          isCost={isCost}
          meterLabel={meterLabel}
          onSelect={onSelect}
        />
      </CardContent>
    </Card>
  );
}

type TopConsumersDatum = {
  id: string;
  label: string;
  sublabel: string;
  scope: "user" | "workspace";
  value: number;
};

function TopConsumersBody({
  ready,
  data,
  isCost,
  meterLabel,
  onSelect,
}: {
  ready: boolean;
  data: TopConsumersDatum[];
  isCost: boolean;
  meterLabel: string;
  onSelect: (datum: { id: string }) => void;
}) {
  if (!ready) {
    return <ChartSkeleton height={280} />;
  }
  if (data.length === 0) {
    return (
      <EmptyChartNote>
        No {meterLabel.toLowerCase()} {isCost ? "cost" : "usage"} this month.
      </EmptyChartNote>
    );
  }
  return (
    <UsageRankedBarChart
      data={data}
      valueLabel={isCost ? `${meterLabel} cost` : meterLabel}
      valueFormatter={isCost ? formatUsd : undefined}
      compactFormatter={isCost ? formatUsdCompact : undefined}
      onSelect={onSelect}
    />
  );
}

function EmptyChartNote({ children }: { children: ReactNode }) {
  return <p className="py-12 text-center text-sm text-muted-foreground">{children}</p>;
}
