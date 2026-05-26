import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { towerUsageMeterLabel } from "@codalyn/webflow-kit";
import type { StatTileTone } from "@/shared/ui/stat-tile";

export function formatTowerDashboardUsageSnapshot(status: TowerUsageStatusSnapshot): {
  value: string;
  hint: string;
  tone: StatTileTone;
} {
  if (!status.metered || status.meters.length === 0) {
    return {
      value: status.tier === "pro" ? "Pro" : "Free",
      hint: "Not metered this month",
      tone: status.tier === "pro" ? "positive" : "default",
    };
  }

  const metered = status.meters.filter((meter) => meter.limit !== null && meter.limit > 0);
  if (metered.length === 0) {
    return {
      value: status.tier === "pro" ? "Pro" : "Free",
      hint: "Unlimited on this plan",
      tone: "default",
    };
  }

  const highest = metered.reduce((current, next) => {
    const currentRatio = current.used / (current.limit ?? 1);
    const nextRatio = next.used / (next.limit ?? 1);
    return nextRatio > currentRatio ? next : current;
  });
  const ratio = Math.round((highest.used / (highest.limit ?? 1)) * 100);
  const hasExceeded = status.meters.some((meter) => meter.level === "exceeded");
  const hasApproaching = status.approachingMeters.length > 0;

  if (hasExceeded) {
    return {
      value: `${ratio}%`,
      hint: `${towerUsageMeterLabel(highest.kind)} limit reached`,
      tone: "warn",
    };
  }

  if (hasApproaching) {
    return {
      value: `${ratio}%`,
      hint: `Approaching ${towerUsageMeterLabel(highest.kind)} limit`,
      tone: "warn",
    };
  }

  return {
    value: `${ratio}%`,
    hint: `${status.tier === "pro" ? "Pro" : "Free"} · highest meter`,
    tone: "default",
  };
}
