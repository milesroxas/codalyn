"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { OperatorUsageTrendPoint } from "@/server/operator/types";
import {
  formatUsageCompact,
  formatUsageFull,
  formatYearMonthLong,
  formatYearMonthShort,
  USAGE_METER_CHART_CONFIG,
  USAGE_METER_COUNT_KEY,
  USAGE_METER_KINDS,
} from "@/shared/lib/usage-meter-chart";
import { cn } from "@/shared/lib/utils";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";

const METER_KEYS = USAGE_METER_KINDS.map((kind) => USAGE_METER_COUNT_KEY[kind]);

export type UsageTrendChartProps = {
  data: OperatorUsageTrendPoint[];
  /** Compact mode for inline placement (detail sheets): smaller height, no axes/legend. */
  compact?: boolean;
  /** Full value formatter for tooltips (defaults to formatted counts; pass `formatUsd` for the cost lens). */
  valueFormatter?: (value: number) => string;
  /** Compact value formatter for the Y axis (defaults to compact counts). */
  compactFormatter?: (value: number) => string;
};

export function UsageTrendChart({
  data,
  compact = false,
  valueFormatter = formatUsageFull,
  compactFormatter = formatUsageCompact,
}: UsageTrendChartProps) {
  return (
    <ChartContainer
      config={USAGE_METER_CHART_CONFIG}
      className={cn("aspect-auto w-full", compact ? "h-28" : "h-[260px]")}
    >
      <AreaChart data={data} margin={compact ? { left: 0, right: 0, top: 4, bottom: 0 } : undefined}>
        <defs>
          {METER_KEYS.map((key) => (
            <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.7} />
              <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        {compact ? null : <CartesianGrid vertical={false} />}
        <XAxis
          dataKey="yearMonth"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
          hide={compact}
          tickFormatter={formatYearMonthShort}
        />
        {compact ? null : <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={compactFormatter} />}
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => formatYearMonthLong(String(value))}
              formatter={(rawValue, name) => {
                const config = USAGE_METER_CHART_CONFIG[String(name)];
                const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
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
        {METER_KEYS.map((key) => (
          <Area
            key={key}
            dataKey={key}
            type="natural"
            fill={`url(#fill-${key})`}
            stroke={`var(--color-${key})`}
            stackId="usage"
          />
        ))}
        {compact ? null : <ChartLegend content={<ChartLegendContent />} />}
      </AreaChart>
    </ChartContainer>
  );
}
