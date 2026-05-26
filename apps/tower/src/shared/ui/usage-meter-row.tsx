import { formatTowerUsageRatio, type TowerUsageMeterSnapshot, towerUsageMeterLabel } from "@codalyn/webflow-kit";
import { usageMeterLevelLabel, usageMeterProgressValue } from "@/shared/lib/usage-meter-ui";
import { Badge } from "@/shared/ui/badge";
import { Progress, type ProgressIndicatorLevel } from "@/shared/ui/progress";

function progressLevelForMeter(level: TowerUsageMeterSnapshot["level"]): ProgressIndicatorLevel {
  switch (level) {
    case "approaching":
      return "approaching";
    case "exceeded":
      return "exceeded";
    case "unmetered":
      return "unmetered";
    default:
      return "ok";
  }
}

export function UsageMeterRow({ meter }: { meter: TowerUsageMeterSnapshot }) {
  const statusLabel = usageMeterLevelLabel(meter.level);
  const progressValue = usageMeterProgressValue(meter.used, meter.limit);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{towerUsageMeterLabel(meter.kind)}</span>
          {statusLabel ? (
            <Badge variant={meter.level === "exceeded" ? "destructive" : "secondary"}>{statusLabel}</Badge>
          ) : null}
        </div>
        <span className="font-mono text-sm tabular-nums text-foreground">
          {formatTowerUsageRatio(meter.used, meter.limit)}
        </span>
      </div>
      {meter.limit === null ? null : (
        <Progress
          value={progressValue}
          indicatorLevel={progressLevelForMeter(meter.level)}
          aria-label={`${towerUsageMeterLabel(meter.kind)} ${formatTowerUsageRatio(meter.used, meter.limit)}`}
        />
      )}
    </div>
  );
}
