import { buildTowerUsageContributionSegments, type TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { Progress } from "@/shared/ui/progress";

type UsageContributionBreakdownProps = {
  status: Pick<TowerUsageStatusSnapshot, "meters" | "designerApiBreakdown">;
};

/** Quantitative "what's driving usage" mix for the active scope, shared by every tier. */
export function UsageContributionBreakdown({ status }: UsageContributionBreakdownProps) {
  const segments = buildTowerUsageContributionSegments(status);

  if (segments.length === 0) {
    return <p className="text-sm text-muted-foreground">No metered activity yet this month.</p>;
  }

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="space-y-3">
      {segments.map((segment) => {
        const share = total > 0 ? Math.round((segment.value / total) * 100) : 0;
        return (
          <div key={segment.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{segment.label}</span>
              <span className="font-mono tabular-nums text-foreground">
                {segment.value.toLocaleString()} <span className="text-muted-foreground">({share}%)</span>
              </span>
            </div>
            <Progress value={share} aria-label={`${segment.label} ${share}%`} />
          </div>
        );
      })}
    </div>
  );
}
