"use client";

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import { formatUsageCompact, formatUsageFull } from "@/shared/lib/usage-meter-chart";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";

export type UsageRankedBarDatum = {
  id: string;
  label: string;
  sublabel: string;
  scope: "user" | "workspace";
  value: number;
};

export type UsageRankedBarChartProps = {
  data: UsageRankedBarDatum[];
  /** Tooltip label for the measured value (e.g. the selected meter name). */
  valueLabel: string;
  onSelect?: (datum: UsageRankedBarDatum) => void;
  /** Full value formatter for the tooltip (defaults to counts; pass `formatUsd` for the cost lens). */
  valueFormatter?: (value: number) => string;
  /** Compact value formatter for the inline bar labels (defaults to compact counts). */
  compactFormatter?: (value: number) => string;
};

export function UsageRankedBarChart({
  data,
  valueLabel,
  onSelect,
  valueFormatter = formatUsageFull,
  compactFormatter = formatUsageCompact,
}: UsageRankedBarChartProps) {
  const config: ChartConfig = { value: { label: valueLabel, color: "var(--chart-1)" } };
  const height = Math.max(160, data.length * 40);

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 36, top: 4, bottom: 4 }}>
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={140}
          tickFormatter={(value: string) => (value.length > 20 ? `${value.slice(0, 19)}…` : value)}
        />
        <XAxis type="number" hide />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(rawValue) => {
                const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
                return (
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {valueLabel}: {valueFormatter(Number.isFinite(value) ? value : 0)}
                  </span>
                );
              }}
            />
          }
        />
        <Bar
          dataKey="value"
          radius={4}
          onClick={(datum: unknown) => {
            const payload = (datum as { payload?: UsageRankedBarDatum }).payload;
            if (payload && onSelect) {
              onSelect(payload);
            }
          }}
          className={onSelect ? "cursor-pointer" : undefined}
        >
          {data.map((datum) => (
            <Cell key={datum.id} fill={datum.scope === "workspace" ? "var(--chart-4)" : "var(--chart-2)"} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            className="fill-muted-foreground"
            formatter={(value) => compactFormatter(Number(value ?? 0))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
