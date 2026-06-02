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

/** How monthly caps are determined for the signed-in account (operator overrides vs tier defaults). */
export type TowerUsageLimitsKind = "standard" | "custom" | "unmetered";

/** Monthly usage cap tier for the signed-in user in the active workspace context (1:1 with plan key). */
export type TowerUsageTier = TowerPlanKey;

import type { TowerPlanBillingScope, TowerPlanKey } from "./tower-plan-catalog.js";
import { normalizeTowerPlanKey, towerPlanName } from "./tower-plan-catalog.js";
import type { TowerUsageDesignerApiBreakdown } from "./webflow-proxy-usage-category.js";

/** Plan context for rendering accurate labels in Tower and Beacon. */
export type TowerUsagePlanContext = {
  key: TowerPlanKey;
  /** Customer-facing marketing name (e.g. "Studio"). */
  name: string;
  billingScope: TowerPlanBillingScope;
};

/** Whether the reported meters are enforced per individual user or pooled across the paid workspace. */
export type TowerUsageScope = "user" | "workspace";

export type TowerUsageStatusSnapshot = {
  yearMonth: string;
  tier: TowerUsageTier;
  /** Plan-aware context (key/name/billing scope) for accurate Tower + Beacon labels. */
  plan: TowerUsagePlanContext;
  /**
   * Actual enforcement scope for the reported meters. `workspace` means the counts and caps are pooled
   * across the active paid Team workspace; `user` means they are scoped to the signed-in user.
   */
  usageScope: TowerUsageScope;
  /** `custom` = operator-set caps; `unmetered` = metering disabled by operator or platform. */
  limitsKind: TowerUsageLimitsKind;
  metered: boolean;
  meters: TowerUsageMeterSnapshot[];
  approachingMeters: TowerUsageMeterSnapshot[];
  /** Per-feature split of Designer API (webflow proxy) usage when category tracking is available. */
  designerApiBreakdown: TowerUsageDesignerApiBreakdown | null;
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

const TOWER_USAGE_LIMITS_KINDS: readonly TowerUsageLimitsKind[] = ["standard", "custom", "unmetered"];
const TOWER_USAGE_METER_LEVELS: readonly UsageMeterLevel[] = ["unmetered", "ok", "approaching", "exceeded"];

function normalizeNonNegativeInt(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
    return null;
  }
  return Math.trunc(raw);
}

function normalizeLimit(raw: unknown): number | null {
  if (raw === null) {
    return null;
  }
  return normalizeNonNegativeInt(raw);
}

function normalizeUsageMeterSnapshot(raw: unknown): TowerUsageMeterSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Record<string, unknown>;
  const kind = normalizeTowerUsageMeterKind(typeof value.kind === "string" ? value.kind : undefined);
  const used = normalizeNonNegativeInt(value.used);
  if (kind == null || used == null) {
    return null;
  }
  const limit = "limit" in value ? normalizeLimit(value.limit) : null;
  const progressMax = normalizeNonNegativeInt(value.progressMax) ?? limit ?? Math.max(used, 1);
  const level =
    typeof value.level === "string" && (TOWER_USAGE_METER_LEVELS as readonly string[]).includes(value.level)
      ? (value.level as UsageMeterLevel)
      : classifyUsageMeter(used, limit);
  return { kind, used, limit, progressMax, level };
}

function normalizeUsagePlanContext(raw: unknown, fallbackTier: TowerUsageTier): TowerUsagePlanContext {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const key = normalizeTowerPlanKey(value.key) ?? fallbackTier;
  const name = typeof value.name === "string" && value.name.length > 0 ? value.name : towerPlanName(key);
  const billingScope = value.billingScope === "workspace" ? "workspace" : "user";
  return { key, name, billingScope };
}

function normalizeDesignerApiBreakdown(raw: unknown): TowerUsageDesignerApiBreakdown | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Record<string, unknown>;
  const cmsSlots = normalizeNonNegativeInt(value.cmsSlots);
  const imageUploadCms = normalizeNonNegativeInt(value.imageUploadCms);
  if (cmsSlots == null || imageUploadCms == null) {
    return null;
  }
  return { cmsSlots, imageUploadCms };
}

/**
 * Runtime-safe parse of a Tower usage status payload (Beacon receives this over the wire).
 * Validates known fields and degrades gracefully on unknown/new shapes; returns null only when
 * the payload is fundamentally unusable (missing year-month or no parseable meters).
 */
export function normalizeTowerUsageStatusSnapshot(raw: unknown): TowerUsageStatusSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Record<string, unknown>;
  if (typeof value.yearMonth !== "string" || value.yearMonth.length === 0) {
    return null;
  }
  const tier = normalizeTowerPlanKey(value.tier) ?? "free";
  const plan = normalizeUsagePlanContext(value.plan, tier);
  const usageScope: TowerUsageScope = value.usageScope === "workspace" ? "workspace" : "user";
  const limitsKind =
    typeof value.limitsKind === "string" && (TOWER_USAGE_LIMITS_KINDS as readonly string[]).includes(value.limitsKind)
      ? (value.limitsKind as TowerUsageLimitsKind)
      : "standard";
  const meters = Array.isArray(value.meters)
    ? value.meters.flatMap((meter) => {
        const normalized = normalizeUsageMeterSnapshot(meter);
        return normalized ? [normalized] : [];
      })
    : [];
  if (meters.length === 0) {
    return null;
  }
  const approachingMeters = Array.isArray(value.approachingMeters)
    ? value.approachingMeters.flatMap((meter) => {
        const normalized = normalizeUsageMeterSnapshot(meter);
        return normalized ? [normalized] : [];
      })
    : pickApproachingUsageMeters(meters);

  return {
    yearMonth: value.yearMonth,
    tier,
    plan,
    usageScope,
    limitsKind,
    metered: typeof value.metered === "boolean" ? value.metered : true,
    meters,
    approachingMeters,
    designerApiBreakdown: normalizeDesignerApiBreakdown(value.designerApiBreakdown),
  };
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
