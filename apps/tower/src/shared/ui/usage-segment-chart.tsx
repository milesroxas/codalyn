"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { OperatorUsageSegmentTotals } from "@/server/operator/types";
import {
  formatUsageCompact,
  formatUsageFull,
  USAGE_METER_COUNT_KEY,
  USAGE_METER_KINDS,
  USAGE_SEGMENT_CHART_CONFIG,
  usageMeterLabel,
} from "@/shared/lib/usage-meter-chart";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";

export type UsageSegmentChartProps = {
  segments: OperatorUsageSegmentTotals[];
  /** Full value formatter for the tooltip (defaults to counts; pass `formatUsd` for the cost lens). */
  valueFormatter?: (value: number) => string;
  /** Compact value formatter for the Y axis (defaults to compact counts). */
  compactFormatter?: (value: number) => string;
};

export function UsageSegmentChart({
  segments,
  valueFormatter = formatUsageFull,
  compactFormatter = formatUsageCompact,
}: UsageSegmentChartProps) {
  const data = React.useMemo(() => {
    const individual = segments.find((segment) => segment.segment === "individual");
    const workspace = segments.find((segment) => segment.segment === "workspace");
    return USAGE_METER_KINDS.map((kind) => {
      const countKey = USAGE_METER_COUNT_KEY[kind];
      return {
        meter: usageMeterLabel(kind),
        individual: individual?.[countKey] ?? 0,
        workspace: workspace?.[countKey] ?? 0,
      };
    });
  }, [segments]);

  return (
    <ChartContainer config={USAGE_SEGMENT_CHART_CONFIG} className="aspect-auto h-[240px] w-full">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="meter" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={compactFormatter} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(rawValue, name) => {
                const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
                const config = USAGE_SEGMENT_CHART_CONFIG[String(name)];
                return (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="size-2.5 rounded-[2px]"
                        style={{ backgroundColor: `var(--color-${String(name)})` }}
                      />
                      {config?.label ?? name}
                    </span>
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {valueFormatter(Number.isFinite(value) ? value : 0)}
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="individual" stackId="segment" fill="var(--color-individual)" radius={[0, 0, 4, 4]} />
        <Bar dataKey="workspace" stackId="segment" fill="var(--color-workspace)" radius={[4, 4, 0, 0]} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}
