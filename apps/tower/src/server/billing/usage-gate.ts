import { and, eq, sql } from "drizzle-orm";
import type { TowerEntitlement } from "@/server/billing/entitlements";
import {
  capForMeterKind,
  EMPTY_METERING_OVERRIDES,
  type MeteringOverrideFields,
  type MeterKind,
  resolveMeteringPolicyFromEntitlement,
  utcYearMonth,
} from "@/server/billing/metering-policy";
import { getTowerLimitsSnapshot } from "@/server/billing/tower-limits-config";
import { db } from "@/shared/lib/db";
import { member, organization, towerUsageMonth, user } from "@/shared/lib/db/auth-schema";

type TowerDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type GateOk = { ok: true; used: number; limit: number | null; tier: TowerEntitlement["tier"] };
type GateNo = { ok: false; used: number; limit: number; tier: TowerEntitlement["tier"]; response: Response };

type UsageCountPatch = Pick<
  typeof towerUsageMonth.$inferInsert,
  "webflowProxyRequestCount" | "cmsWriteCount" | "imageOptimizeCount"
>;

const METER_COUNT_FIELD: Record<MeterKind, keyof UsageCountPatch> = {
  webflowProxy: "webflowProxyRequestCount",
  cmsWrite: "cmsWriteCount",
  image: "imageOptimizeCount",
};

const METER_INSERT_DEFAULTS: UsageCountPatch = {
  webflowProxyRequestCount: 0,
  cmsWriteCount: 0,
  imageOptimizeCount: 0,
};

export async function loadMeteringOverrideFields(
  userId: string,
  activeOrganizationId: string | null
): Promise<{ user: MeteringOverrideFields; organization: MeteringOverrideFields | null }> {
  const [userRow] = await db
    .select({
      meteringEnabled: user.meteringEnabled,
      webflowProxyLimitOverride: user.webflowProxyLimitOverride,
      cmsWriteLimitOverride: user.cmsWriteLimitOverride,
      imageOptimizeLimitOverride: user.imageOptimizeLimitOverride,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const userFields: MeteringOverrideFields = userRow
    ? {
        meteringEnabled: Boolean(userRow.meteringEnabled),
        webflowProxyLimitOverride: userRow.webflowProxyLimitOverride ?? null,
        cmsWriteLimitOverride: userRow.cmsWriteLimitOverride ?? null,
        imageOptimizeLimitOverride: userRow.imageOptimizeLimitOverride ?? null,
      }
    : EMPTY_METERING_OVERRIDES;

  if (!activeOrganizationId) {
    return { user: userFields, organization: null };
  }

  const [orgRow] = await db
    .select({
      meteringEnabled: organization.meteringEnabled,
      webflowProxyLimitOverride: organization.webflowProxyLimitOverride,
      cmsWriteLimitOverride: organization.cmsWriteLimitOverride,
      imageOptimizeLimitOverride: organization.imageOptimizeLimitOverride,
    })
    .from(organization)
    .where(eq(organization.id, activeOrganizationId))
    .limit(1);

  return {
    user: userFields,
    organization: orgRow
      ? {
          meteringEnabled: Boolean(orgRow.meteringEnabled),
          webflowProxyLimitOverride: orgRow.webflowProxyLimitOverride ?? null,
          cmsWriteLimitOverride: orgRow.cmsWriteLimitOverride ?? null,
          imageOptimizeLimitOverride: orgRow.imageOptimizeLimitOverride ?? null,
        }
      : null,
  };
}

/**
 * Reserves one unit in a transaction. Returns 429 + JSON when the cap is exceeded.
 */
async function consumeMeter(
  userId: string,
  entitlement: TowerEntitlement,
  activeOrganizationId: string | null,
  kind: MeterKind
): Promise<GateOk | GateNo> {
  const overrides = await loadMeteringOverrideFields(userId, activeOrganizationId);
  const limits = await getTowerLimitsSnapshot();
  const policy = resolveMeteringPolicyFromEntitlement(entitlement, overrides.user, overrides.organization, limits);
  const cap = capForMeterKind(policy, kind);
  if (policy.skipMetering || cap === null) {
    return { ok: true, used: 0, limit: null, tier: entitlement.tier };
  }
  return runConsume(userId, kind, entitlement.tier, cap);
}

export function consumeWebflowProxy(
  userId: string,
  entitlement: TowerEntitlement,
  activeOrganizationId: string | null
): Promise<GateOk | GateNo> {
  return consumeMeter(userId, entitlement, activeOrganizationId, "webflowProxy");
}

export function consumeCmsWrite(
  userId: string,
  entitlement: TowerEntitlement,
  activeOrganizationId: string | null
): Promise<GateOk | GateNo> {
  return consumeMeter(userId, entitlement, activeOrganizationId, "cmsWrite");
}

export function consumeImageOptimize(
  userId: string,
  entitlement: TowerEntitlement,
  activeOrganizationId: string | null
): Promise<GateOk | GateNo> {
  return consumeMeter(userId, entitlement, activeOrganizationId, "image");
}

type TxBlock = { blocked: true; used: number; limit: number } | { blocked: false; used: number; limit: number };

async function reserveMonthlyCount(
  tx: TowerDbTransaction,
  userId: string,
  ym: string,
  kind: MeterKind,
  cap: number
): Promise<TxBlock> {
  const lockKey = `${userId}|${ym}|${kind}`;
  await tx.execute(sql`SELECT pg_advisory_xact_lock((hashtext(${lockKey}::text))::bigint)`);

  const countField = METER_COUNT_FIELD[kind];
  const rows = await tx
    .select()
    .from(towerUsageMonth)
    .where(and(eq(towerUsageMonth.userId, userId), eq(towerUsageMonth.yearMonth, ym)))
    .for("update");

  const row = rows[0];
  const current = row?.[countField] ?? 0;
  if (current >= cap) {
    return { blocked: true, used: current, limit: cap };
  }
  const next = current + 1;

  if (row) {
    await tx
      .update(towerUsageMonth)
      .set({ [countField]: next })
      .where(and(eq(towerUsageMonth.userId, userId), eq(towerUsageMonth.yearMonth, ym)));
  } else {
    await tx.insert(towerUsageMonth).values({
      userId,
      yearMonth: ym,
      ...METER_INSERT_DEFAULTS,
      [countField]: 1,
    });
  }
  return { blocked: false, used: next, limit: cap };
}

async function runConsume(
  userId: string,
  kind: MeterKind,
  tier: TowerEntitlement["tier"],
  cap: number
): Promise<GateOk | GateNo> {
  const ym = utcYearMonth();
  const res = await db.transaction((tx) => reserveMonthlyCount(tx, userId, ym, kind, cap));

  if (res.blocked) {
    return {
      ok: false,
      used: res.used,
      limit: res.limit,
      tier,
      response: Response.json(
        {
          error: "usage_limit",
          code: "TOWER_USAGE_LIMIT",
          message:
            "Monthly usage limit reached for your plan. Upgrade to Pro in Tower, or try again after the month resets.",
          kind,
          used: res.used,
          limit: res.limit,
        },
        { status: 402, headers: { "Cache-Control": "no-store" } }
      ),
    };
  }
  return { ok: true, used: res.used, limit: res.limit, tier };
}

export async function getUsageSnapshot(userId: string): Promise<{
  yearMonth: string;
  webflowProxyRequestCount: number;
  cmsWriteCount: number;
  imageOptimizeCount: number;
}> {
  const ym = utcYearMonth();
  const [row] = await db
    .select()
    .from(towerUsageMonth)
    .where(and(eq(towerUsageMonth.userId, userId), eq(towerUsageMonth.yearMonth, ym)))
    .limit(1);
  return {
    yearMonth: ym,
    webflowProxyRequestCount: row?.webflowProxyRequestCount ?? 0,
    cmsWriteCount: row?.cmsWriteCount ?? 0,
    imageOptimizeCount: row?.imageOptimizeCount ?? 0,
  };
}

export async function resetUsageForUser(userId: string, yearMonth = utcYearMonth()): Promise<void> {
  await db
    .update(towerUsageMonth)
    .set({ webflowProxyRequestCount: 0, cmsWriteCount: 0, imageOptimizeCount: 0 })
    .where(and(eq(towerUsageMonth.userId, userId), eq(towerUsageMonth.yearMonth, yearMonth)));
}

export async function resetUsageForOrganizationMembers(
  organizationId: string,
  yearMonth = utcYearMonth()
): Promise<void> {
  const memberRows = await db
    .select({ userId: member.userId })
    .from(member)
    .where(eq(member.organizationId, organizationId));

  await Promise.all(memberRows.map((row) => resetUsageForUser(row.userId, yearMonth)));
}
