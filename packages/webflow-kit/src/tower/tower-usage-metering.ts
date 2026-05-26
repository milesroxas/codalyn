export const TOWER_USAGE_METER_KINDS = ["webflowProxy", "cmsWrite", "image"] as const;

export type TowerUsageMeterKind = (typeof TOWER_USAGE_METER_KINDS)[number];

export const TOWER_USAGE_APPROACHING_LIMIT_RATIO = 0.8;

export const TOWER_USAGE_LIMIT_CODE = "TOWER_USAGE_LIMIT";

export type UsageMeterLevel = "unmetered" | "ok" | "approaching" | "exceeded";

export type TowerUsageMeterSnapshot = {
  kind: TowerUsageMeterKind;
  used: number;
  limit: number | null;
  /** Denominator for the usage progress bar (tier reference when `limit` is null). */
  progressMax: number;
  level: UsageMeterLevel;
};

export type TowerUsageStatusSnapshot = {
  yearMonth: string;
  tier: "free" | "pro";
  metered: boolean;
  meters: TowerUsageMeterSnapshot[];
  approachingMeters: TowerUsageMeterSnapshot[];
};

export function isTowerUsageMeterKind(raw: string): raw is TowerUsageMeterKind {
  return (TOWER_USAGE_METER_KINDS as readonly string[]).includes(raw);
}

/** Accepts current API kinds and legacy `webflow` (proxy). */
export function normalizeTowerUsageMeterKind(raw: string | undefined): TowerUsageMeterKind | null {
  if (raw === "webflow") {
    return "webflowProxy";
  }
  if (raw != null && isTowerUsageMeterKind(raw)) {
    return raw;
  }
  return null;
}

export function classifyUsageMeter(used: number, limit: number | null): UsageMeterLevel {
  if (limit === null) {
    return "unmetered";
  }
  if (used >= limit) {
    return "exceeded";
  }
  if (limit > 0 && used / limit >= TOWER_USAGE_APPROACHING_LIMIT_RATIO) {
    return "approaching";
  }
  return "ok";
}

export function buildTowerUsageMeterSnapshot(
  kind: TowerUsageMeterKind,
  used: number,
  limit: number | null,
  progressMax?: number
): TowerUsageMeterSnapshot {
  const chartMax = progressMax ?? limit ?? Math.max(used, 1);
  return {
    kind,
    used,
    limit,
    progressMax: chartMax,
    level: classifyUsageMeter(used, limit),
  };
}

export function pickApproachingUsageMeters(meters: readonly TowerUsageMeterSnapshot[]): TowerUsageMeterSnapshot[] {
  return meters.filter((meter) => meter.level === "approaching");
}

export function formatTowerUsageRatio(used: number, limit: number | null): string {
  if (limit === null) {
    return `${used} / ∞`;
  }
  return `${used} / ${limit}`;
}

type TowerUsageLimitPayload = {
  code?: string;
  kind?: string;
  used?: number;
  limit?: number;
};

function parseUsageCount(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
    return null;
  }
  return Math.trunc(raw);
}

/** Parses Tower `/api/v1/*` and `/api/v2/*` 402 JSON bodies (`TOWER_USAGE_LIMIT`). */
export function parseTowerUsageLimitBody(body: string): {
  kind: TowerUsageMeterKind;
  used: number;
  limit: number;
} | null {
  try {
    const payload = JSON.parse(body) as TowerUsageLimitPayload;
    if (payload.code !== TOWER_USAGE_LIMIT_CODE) {
      return null;
    }
    const kind = normalizeTowerUsageMeterKind(payload.kind);
    const used = parseUsageCount(payload.used);
    const limit = parseUsageCount(payload.limit);
    if (kind == null || used == null || limit == null) {
      return null;
    }
    return { kind, used, limit };
  } catch {
    return null;
  }
}
