"use client";

import * as React from "react";
import { Cell, Label, Pie, PieChart } from "recharts";
import { formatUsageFull } from "@/shared/lib/usage-meter-chart";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart";

export type UsageCompositionSlice = {
  key: string;
  value: number;
};

export type UsageCompositionChartProps = {
  data: UsageCompositionSlice[];
  config: ChartConfig;
  /** Caption rendered under the centered total inside the donut. */
  centerLabel: string;
  /** Value formatter for the centered total and tooltip (defaults to counts; pass `formatUsd` for cost). */
  valueFormatter?: (value: number) => string;
};

export function UsageCompositionChart({
  data,
  config,
  centerLabel,
  valueFormatter = formatUsageFull,
}: UsageCompositionChartProps) {
  const total = React.useMemo(() => data.reduce((sum, slice) => sum + slice.value, 0), [data]);

  return (
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              nameKey="key"
              hideLabel
              formatter={(rawValue, name) => {
                const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
                const label = config[String(name)]?.label ?? name;
                return (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className="size-2.5 rounded-[2px]"
                        style={{ backgroundColor: `var(--color-${String(name)})` }}
                      />
                      {label}
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
        <Pie data={data} dataKey="value" nameKey="key" innerRadius={60} strokeWidth={4}>
          {data.map((slice) => (
            <Cell key={slice.key} fill={`var(--color-${slice.key})`} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                return null;
              }
              return (
                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="central">
                  <tspan
                    x={viewBox.cx}
                    y={(viewBox.cy ?? 0) - 10}
                    className="fill-foreground text-2xl font-semibold tabular-nums"
                  >
                    {valueFormatter(total)}
                  </tspan>
                  <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 13} className="fill-muted-foreground text-xs">
                    {centerLabel}
                  </tspan>
                </text>
              );
            }}
          />
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="key" />} />
      </PieChart>
    </ChartContainer>
  );
}
