"use client";

import type { OperatorUsageTrendPoint } from "@/server/operator/types";
import { USAGE_METER_KINDS, usageMeterColor, usageMeterLabel } from "@/shared/lib/usage-meter-chart";
import { UsageTrendChart } from "@/shared/ui/usage-trend-chart";

export type OperatorUsageTrendSectionProps = {
  trend: OperatorUsageTrendPoint[];
};

export function OperatorUsageTrendSection({ trend }: OperatorUsageTrendSectionProps) {
  const hasUsage = trend.some(
    (point) => point.webflowProxyRequestCount + point.cmsWriteCount + point.imageOptimizeCount > 0
  );

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Usage trend</h3>
      <div className="space-y-3 rounded-sm border border-border bg-card p-3">
        {hasUsage ? (
          <>
            <UsageTrendChart data={trend} compact />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {USAGE_METER_KINDS.map((kind) => (
                <span key={kind} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: usageMeterColor(kind) }} />
                  {usageMeterLabel(kind)}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground">No metered usage in the last 12 months.</p>
        )}
      </div>
    </section>
  );
}
