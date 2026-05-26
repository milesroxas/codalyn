import type { UsageMeterLevel } from "@codalyn/webflow-kit";

/** Progress fill percentage for a metered limit; `null` limit yields 0. */
export function usageMeterProgressValue(used: number, limit: number | null): number {
  if (limit === null || limit <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((used / limit) * 100));
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
