import { eq } from "drizzle-orm";
import type { TowerTier } from "@/server/billing/entitlements";
import { db } from "@/shared/lib/db";
import { towerPlatformMetering } from "@/shared/lib/db/auth-schema";

export const TOWER_PLATFORM_METERING_ID = "default";

export type TowerTierLimits = {
  webflowProxyRequestsPerMonth: number;
  cmsWritesPerMonth: number;
  /**
   * Monthly image optimization **credits** (not export count). Larger/more expensive optimizations
   * consume multiple credits — see `calculateImageOptimizationCredits` in `@codalyn/webflow-kit`.
   */
  imageOptimizesPerMonth: number;
};

export type TowerLimitsSnapshot = {
  globalMeteringEnabled: boolean;
  envEmergencyMeteringDisabled: boolean;
  free: TowerTierLimits;
  pro: TowerTierLimits;
  studio: TowerTierLimits;
  team: TowerTierLimits;
  updatedAt: string | null;
};

export type TowerLimitsPatch = {
  globalMeteringEnabled?: boolean;
  free?: Partial<TowerTierLimits>;
  pro?: Partial<TowerTierLimits>;
  studio?: Partial<TowerTierLimits>;
  team?: Partial<TowerTierLimits>;
};

/**
 * Early-access protective caps. Paid plans intentionally stay well below historical
 * "generous" defaults so MVP usage is observable and profitable before limits are raised.
 * Operator overrides and env seeds still take precedence (see resolve order below).
 */
const CODE_DEFAULTS = {
  globalMeteringEnabled: true,
  free: {
    webflowProxyRequestsPerMonth: 2_500,
    cmsWritesPerMonth: 500,
    imageOptimizesPerMonth: 25,
  },
  pro: {
    webflowProxyRequestsPerMonth: 25_000,
    cmsWritesPerMonth: 5_000,
    imageOptimizesPerMonth: 500,
  },
  studio: {
    webflowProxyRequestsPerMonth: 60_000,
    cmsWritesPerMonth: 12_000,
    imageOptimizesPerMonth: 1_500,
  },
  team: {
    webflowProxyRequestsPerMonth: 120_000,
    cmsWritesPerMonth: 25_000,
    imageOptimizesPerMonth: 3_000,
  },
} as const satisfies Pick<TowerLimitsSnapshot, "globalMeteringEnabled" | "free" | "pro" | "studio" | "team">;

const envNum = (name: string, fallback: number): number => {
  const v = process.env[name]?.trim();
  if (v) {
    const n = Number.parseInt(v, 10);
    if (Number.isFinite(n) && n >= 0) {
      return n;
    }
  }
  return fallback;
};

function envEmergencyMeteringDisabled(): boolean {
  return process.env.TOWER_METERING_DISABLED === "1" || process.env.TOWER_METERING_DISABLED === "true";
}

function seedTierLimitsFromEnv(): {
  free: TowerTierLimits;
  pro: TowerTierLimits;
  studio: TowerTierLimits;
  team: TowerTierLimits;
} {
  const pro = {
    webflowProxyRequestsPerMonth: envNum(
      "TOWER_PRO_WEBFLOW_PROXY_REQUESTS_PER_MONTH",
      CODE_DEFAULTS.pro.webflowProxyRequestsPerMonth
    ),
    cmsWritesPerMonth: envNum("TOWER_PRO_CMS_WRITES_PER_MONTH", CODE_DEFAULTS.pro.cmsWritesPerMonth),
    imageOptimizesPerMonth: envNum("TOWER_PRO_IMAGE_OPTIMIZES_PER_MONTH", CODE_DEFAULTS.pro.imageOptimizesPerMonth),
  };
  return {
    free: {
      webflowProxyRequestsPerMonth: envNum(
        "TOWER_FREE_WEBFLOW_PROXY_REQUESTS_PER_MONTH",
        CODE_DEFAULTS.free.webflowProxyRequestsPerMonth
      ),
      cmsWritesPerMonth: envNum("TOWER_FREE_CMS_WRITES_PER_MONTH", CODE_DEFAULTS.free.cmsWritesPerMonth),
      imageOptimizesPerMonth: envNum("TOWER_FREE_IMAGE_OPTIMIZES_PER_MONTH", CODE_DEFAULTS.free.imageOptimizesPerMonth),
    },
    pro,
    studio: {
      webflowProxyRequestsPerMonth: envNum(
        "TOWER_STUDIO_WEBFLOW_PROXY_REQUESTS_PER_MONTH",
        CODE_DEFAULTS.studio.webflowProxyRequestsPerMonth
      ),
      cmsWritesPerMonth: envNum("TOWER_STUDIO_CMS_WRITES_PER_MONTH", CODE_DEFAULTS.studio.cmsWritesPerMonth),
      imageOptimizesPerMonth: envNum(
        "TOWER_STUDIO_IMAGE_OPTIMIZES_PER_MONTH",
        CODE_DEFAULTS.studio.imageOptimizesPerMonth
      ),
    },
    team: {
      webflowProxyRequestsPerMonth: envNum(
        "TOWER_TEAM_WEBFLOW_PROXY_REQUESTS_PER_MONTH",
        CODE_DEFAULTS.team.webflowProxyRequestsPerMonth
      ),
      cmsWritesPerMonth: envNum("TOWER_TEAM_CMS_WRITES_PER_MONTH", CODE_DEFAULTS.team.cmsWritesPerMonth),
      imageOptimizesPerMonth: envNum("TOWER_TEAM_IMAGE_OPTIMIZES_PER_MONTH", CODE_DEFAULTS.team.imageOptimizesPerMonth),
    },
  };
}

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) {
    return null;
  }
  return typeof d === "string" ? new Date(d).toISOString() : d.toISOString();
}

function rowToSnapshot(row: typeof towerPlatformMetering.$inferSelect): TowerLimitsSnapshot {
  return {
    globalMeteringEnabled: Boolean(row.globalMeteringEnabled),
    envEmergencyMeteringDisabled: envEmergencyMeteringDisabled(),
    free: {
      webflowProxyRequestsPerMonth: row.freeWebflowProxyRequestsPerMonth,
      cmsWritesPerMonth: row.freeCmsWritesPerMonth,
      imageOptimizesPerMonth: row.freeImageOptimizesPerMonth,
    },
    pro: {
      webflowProxyRequestsPerMonth: row.proWebflowProxyRequestsPerMonth,
      cmsWritesPerMonth: row.proCmsWritesPerMonth,
      imageOptimizesPerMonth: row.proImageOptimizesPerMonth,
    },
    studio: {
      webflowProxyRequestsPerMonth: row.studioWebflowProxyRequestsPerMonth,
      cmsWritesPerMonth: row.studioCmsWritesPerMonth,
      imageOptimizesPerMonth: row.studioImageOptimizesPerMonth,
    },
    team: {
      webflowProxyRequestsPerMonth: row.teamWebflowProxyRequestsPerMonth,
      cmsWritesPerMonth: row.teamCmsWritesPerMonth,
      imageOptimizesPerMonth: row.teamImageOptimizesPerMonth,
    },
    updatedAt: toIso(row.updatedAt),
  };
}

function bootstrapSnapshot(): TowerLimitsSnapshot {
  const seeded = seedTierLimitsFromEnv();
  return {
    globalMeteringEnabled: CODE_DEFAULTS.globalMeteringEnabled,
    envEmergencyMeteringDisabled: envEmergencyMeteringDisabled(),
    free: seeded.free,
    pro: seeded.pro,
    studio: seeded.studio,
    team: seeded.team,
    updatedAt: null,
  };
}

let cached: TowerLimitsSnapshot | null = null;

export function invalidateTowerLimitsCache(): void {
  cached = null;
}

export function isGlobalMeteringDisabled(snapshot: TowerLimitsSnapshot): boolean {
  return snapshot.envEmergencyMeteringDisabled || !snapshot.globalMeteringEnabled;
}

export function tierLimitsFromSnapshot(snapshot: TowerLimitsSnapshot, tier: TowerTier): TowerTierLimits {
  switch (tier) {
    case "team":
      return snapshot.team;
    case "studio":
      return snapshot.studio;
    case "pro":
      return snapshot.pro;
    default:
      return snapshot.free;
  }
}

export async function getTowerLimitsSnapshot(): Promise<TowerLimitsSnapshot> {
  if (cached) {
    return cached;
  }

  const [row] = await db
    .select()
    .from(towerPlatformMetering)
    .where(eq(towerPlatformMetering.id, TOWER_PLATFORM_METERING_ID))
    .limit(1);

  if (row) {
    cached = rowToSnapshot(row);
    return cached;
  }

  const seeded = seedTierLimitsFromEnv();
  const [inserted] = await db
    .insert(towerPlatformMetering)
    .values({
      id: TOWER_PLATFORM_METERING_ID,
      globalMeteringEnabled: CODE_DEFAULTS.globalMeteringEnabled,
      freeWebflowProxyRequestsPerMonth: seeded.free.webflowProxyRequestsPerMonth,
      freeCmsWritesPerMonth: seeded.free.cmsWritesPerMonth,
      freeImageOptimizesPerMonth: seeded.free.imageOptimizesPerMonth,
      proWebflowProxyRequestsPerMonth: seeded.pro.webflowProxyRequestsPerMonth,
      proCmsWritesPerMonth: seeded.pro.cmsWritesPerMonth,
      proImageOptimizesPerMonth: seeded.pro.imageOptimizesPerMonth,
      studioWebflowProxyRequestsPerMonth: seeded.studio.webflowProxyRequestsPerMonth,
      studioCmsWritesPerMonth: seeded.studio.cmsWritesPerMonth,
      studioImageOptimizesPerMonth: seeded.studio.imageOptimizesPerMonth,
      teamWebflowProxyRequestsPerMonth: seeded.team.webflowProxyRequestsPerMonth,
      teamCmsWritesPerMonth: seeded.team.cmsWritesPerMonth,
      teamImageOptimizesPerMonth: seeded.team.imageOptimizesPerMonth,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) {
    cached = rowToSnapshot(inserted);
    return cached;
  }

  const [existing] = await db
    .select()
    .from(towerPlatformMetering)
    .where(eq(towerPlatformMetering.id, TOWER_PLATFORM_METERING_ID))
    .limit(1);

  cached = existing ? rowToSnapshot(existing) : bootstrapSnapshot();
  return cached;
}

export function parseRequiredPlatformLimitField(raw: unknown): number | "invalid" {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || raw > 10_000_000 || !Number.isInteger(raw)) {
    return "invalid";
  }
  return raw;
}

function parseTierLimitsPatch(
  tier: "free" | "pro" | "studio" | "team",
  tierRaw: unknown
): Partial<TowerTierLimits> | { error: string } {
  if (!tierRaw || typeof tierRaw !== "object") {
    return { error: `invalid_${tier}` };
  }
  const tierBody = tierRaw as Record<string, unknown>;
  const tierPatch: Partial<TowerTierLimits> = {};

  if ("webflowProxyRequestsPerMonth" in tierBody) {
    const parsed = parseRequiredPlatformLimitField(tierBody.webflowProxyRequestsPerMonth);
    if (parsed === "invalid") {
      return { error: `invalid_${tier}_webflowProxyRequestsPerMonth` };
    }
    tierPatch.webflowProxyRequestsPerMonth = parsed;
  }

  if ("cmsWritesPerMonth" in tierBody) {
    const parsed = parseRequiredPlatformLimitField(tierBody.cmsWritesPerMonth);
    if (parsed === "invalid") {
      return { error: `invalid_${tier}_cmsWritesPerMonth` };
    }
    tierPatch.cmsWritesPerMonth = parsed;
  }

  if ("imageOptimizesPerMonth" in tierBody) {
    const parsed = parseRequiredPlatformLimitField(tierBody.imageOptimizesPerMonth);
    if (parsed === "invalid") {
      return { error: `invalid_${tier}_imageOptimizesPerMonth` };
    }
    tierPatch.imageOptimizesPerMonth = parsed;
  }

  return tierPatch;
}

export function sanitizeTowerLimitsPatch(raw: unknown): TowerLimitsPatch | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "invalid_body" };
  }
  const body = raw as Record<string, unknown>;
  const patch: TowerLimitsPatch = {};

  if ("globalMeteringEnabled" in body) {
    if (typeof body.globalMeteringEnabled !== "boolean") {
      return { error: "invalid_globalMeteringEnabled" };
    }
    patch.globalMeteringEnabled = body.globalMeteringEnabled;
  }

  for (const tier of ["free", "pro", "studio", "team"] as const) {
    if (!(tier in body)) {
      continue;
    }
    const tierPatch = parseTierLimitsPatch(tier, body[tier]);
    if ("error" in tierPatch) {
      return tierPatch;
    }
    if (Object.keys(tierPatch).length > 0) {
      patch[tier] = tierPatch;
    }
  }

  return patch;
}

export async function saveTowerLimitsSnapshot(patch: TowerLimitsPatch): Promise<TowerLimitsSnapshot> {
  await getTowerLimitsSnapshot();

  const updates: Partial<typeof towerPlatformMetering.$inferInsert> = {};
  if (patch.globalMeteringEnabled !== undefined) {
    updates.globalMeteringEnabled = patch.globalMeteringEnabled;
  }
  if (patch.free?.webflowProxyRequestsPerMonth !== undefined) {
    updates.freeWebflowProxyRequestsPerMonth = patch.free.webflowProxyRequestsPerMonth;
  }
  if (patch.free?.cmsWritesPerMonth !== undefined) {
    updates.freeCmsWritesPerMonth = patch.free.cmsWritesPerMonth;
  }
  if (patch.free?.imageOptimizesPerMonth !== undefined) {
    updates.freeImageOptimizesPerMonth = patch.free.imageOptimizesPerMonth;
  }
  if (patch.pro?.webflowProxyRequestsPerMonth !== undefined) {
    updates.proWebflowProxyRequestsPerMonth = patch.pro.webflowProxyRequestsPerMonth;
  }
  if (patch.pro?.cmsWritesPerMonth !== undefined) {
    updates.proCmsWritesPerMonth = patch.pro.cmsWritesPerMonth;
  }
  if (patch.pro?.imageOptimizesPerMonth !== undefined) {
    updates.proImageOptimizesPerMonth = patch.pro.imageOptimizesPerMonth;
  }
  if (patch.studio?.webflowProxyRequestsPerMonth !== undefined) {
    updates.studioWebflowProxyRequestsPerMonth = patch.studio.webflowProxyRequestsPerMonth;
  }
  if (patch.studio?.cmsWritesPerMonth !== undefined) {
    updates.studioCmsWritesPerMonth = patch.studio.cmsWritesPerMonth;
  }
  if (patch.studio?.imageOptimizesPerMonth !== undefined) {
    updates.studioImageOptimizesPerMonth = patch.studio.imageOptimizesPerMonth;
  }
  if (patch.team?.webflowProxyRequestsPerMonth !== undefined) {
    updates.teamWebflowProxyRequestsPerMonth = patch.team.webflowProxyRequestsPerMonth;
  }
  if (patch.team?.cmsWritesPerMonth !== undefined) {
    updates.teamCmsWritesPerMonth = patch.team.cmsWritesPerMonth;
  }
  if (patch.team?.imageOptimizesPerMonth !== undefined) {
    updates.teamImageOptimizesPerMonth = patch.team.imageOptimizesPerMonth;
  }

  if (Object.keys(updates).length > 0) {
    await db.update(towerPlatformMetering).set(updates).where(eq(towerPlatformMetering.id, TOWER_PLATFORM_METERING_ID));
  }

  invalidateTowerLimitsCache();
  return getTowerLimitsSnapshot();
}
