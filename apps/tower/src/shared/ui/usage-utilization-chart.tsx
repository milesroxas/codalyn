"use client";

import * as React from "react";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import type { OperatorUsageUtilizationMeter } from "@/server/operator/types";
import {
  formatUsageFull,
  USAGE_METER_CHART_CONFIG,
  USAGE_METER_COUNT_KEY,
  usageMeterLabel,
} from "@/shared/lib/usage-meter-chart";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";

export type UsageUtilizationChartProps = {
  data: OperatorUsageUtilizationMeter[];
};

type UtilizationRow = {
  key: string;
  label: string;
  pct: number;
  used: number;
  limit: number;
  fill: string;
};

export function UsageUtilizationChart({ data }: UsageUtilizationChartProps) {
  const rows = React.useMemo<UtilizationRow[]>(
    () =>
      data.map((meter) => {
        const key = USAGE_METER_COUNT_KEY[meter.kind];
        const pct = meter.limit > 0 ? Math.min(100, Math.round((meter.used / meter.limit) * 100)) : 0;
        return {
          key,
          label: usageMeterLabel(meter.kind),
          pct,
          used: meter.used,
          limit: meter.limit,
          fill: `var(--color-${key})`,
        };
      }),
    [data]
  );

  return (
    <ChartContainer config={USAGE_METER_CHART_CONFIG} className="aspect-auto h-[240px] w-full">
      <RadialBarChart
        data={rows}
        cx="50%"
        cy="50%"
        innerRadius="35%"
        outerRadius="100%"
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              nameKey="key"
              hideLabel
              formatter={(_value, _name, item) => {
                const payload = item?.payload as UtilizationRow | undefined;
                if (!payload) {
                  return null;
                }
                return (
                  <div className="flex w-full flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: payload.fill }} />
                      {payload.label}
                    </span>
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {payload.pct}% · {formatUsageFull(payload.used)} / {formatUsageFull(payload.limit)}
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <RadialBar dataKey="pct" background cornerRadius={6} />
        <ChartLegend content={<ChartLegendContent nameKey="key" />} />
      </RadialBarChart>
    </ChartContainer>
  );
}
