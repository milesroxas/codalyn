/**
 * Free-tier caps protect Vercel (function invocations + duration, especially the image pipeline).
 * Pro limits are high “fair use” defaults; override with env in edge cases.
 */
const envNum = (name: string, fallback: number) => {
  const v = process.env[name]?.trim();
  if (v) {
    const n = Number.parseInt(v, 10);
    if (Number.isFinite(n) && n >= 0) {
      return n;
    }
  }
  return fallback;
};

export const TOWER_LIMITS = {
  free: {
    webflowRequestsPerMonth: envNum("TOWER_FREE_WEBFLOW_REQUESTS_PER_MONTH", 3_000),
    imageOptimizesPerMonth: envNum("TOWER_FREE_IMAGE_OPTIMIZES_PER_MONTH", 50),
  },
  pro: {
    webflowRequestsPerMonth: envNum("TOWER_PRO_WEBFLOW_REQUESTS_PER_MONTH", 200_000),
    imageOptimizesPerMonth: envNum("TOWER_PRO_IMAGE_OPTIMIZES_PER_MONTH", 10_000),
  },
} as const;

export function meteringDisabled(): boolean {
  return process.env.TOWER_METERING_DISABLED === "1" || process.env.TOWER_METERING_DISABLED === "true";
}
