import type { UsageMeterLevel } from "@codalyn/webflow-kit";

/** Progress fill percentage; clamps at 100%. */
export function usageMeterProgressValue(used: number, progressMax: number): number {
  if (progressMax <= 0) {
    return used > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((used / progressMax) * 100));
}

export function usageMeterLevelLabel(level: UsageMeterLevel): string | null {
  switch (level) {
    case "approaching":
      return "Approaching limit";
    case "exceeded":
      return "Limit reached";
    default:
      return null;
  }
}
