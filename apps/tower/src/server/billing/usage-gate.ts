import { and, eq, sql } from "drizzle-orm";
import type { TowerEntitlement } from "@/server/billing/entitlements";
import {
  EMPTY_METERING_OVERRIDES,
  type MeteringOverrideFields,
  resolveMeteringPolicyFromEntitlement,
  utcYearMonth,
} from "@/server/billing/metering-policy";
import { getTowerLimitsSnapshot } from "@/server/billing/tower-limits-config";
import { db } from "@/shared/lib/db";
import { member, organization, towerUsageMonth, user } from "@/shared/lib/db/auth-schema";

type TowerDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type GateOk = { ok: true; used: number; limit: number | null; tier: TowerEntitlement["tier"] };
type GateNo = { ok: false; used: number; limit: number; tier: TowerEntitlement["tier"]; response: Response };

async function loadMeteringOverrideFields(
  userId: string,
  activeOrganizationId: string | null
): Promise<{ user: MeteringOverrideFields; organization: MeteringOverrideFields | null }> {
  const [userRow] = await db
    .select({
      meteringEnabled: user.meteringEnabled,
      webflowRequestLimitOverride: user.webflowRequestLimitOverride,
      imageOptimizeLimitOverride: user.imageOptimizeLimitOverride,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const userFields: MeteringOverrideFields = userRow
    ? {
        meteringEnabled: Boolean(userRow.meteringEnabled),
        webflowRequestLimitOverride: userRow.webflowRequestLimitOverride ?? null,
        imageOptimizeLimitOverride: userRow.imageOptimizeLimitOverride ?? null,
      }
    : EMPTY_METERING_OVERRIDES;

  if (!activeOrganizationId) {
    return { user: userFields, organization: null };
  }

  const [orgRow] = await db
    .select({
      meteringEnabled: organization.meteringEnabled,
      webflowRequestLimitOverride: organization.webflowRequestLimitOverride,
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
          webflowRequestLimitOverride: orgRow.webflowRequestLimitOverride ?? null,
          imageOptimizeLimitOverride: orgRow.imageOptimizeLimitOverride ?? null,
        }
      : null,
  };
}

/**
 * Reserves one unit in a transaction. Returns 429 + JSON when the cap is exceeded.
 */
export async function consumeWebflowRequest(
  userId: string,
  entitlement: TowerEntitlement,
  activeOrganizationId: string | null
): Promise<GateOk | GateNo> {
  const overrides = await loadMeteringOverrideFields(userId, activeOrganizationId);
  const limits = await getTowerLimitsSnapshot();
  const policy = resolveMeteringPolicyFromEntitlement(entitlement, overrides.user, overrides.organization, limits);
  if (policy.skipMetering || policy.webflowCap === null) {
    return { ok: true, used: 0, limit: null, tier: entitlement.tier };
  }
  return runConsume(userId, "webflow", entitlement.tier, policy.webflowCap);
}

export async function consumeImageOptimize(
  userId: string,
  entitlement: TowerEntitlement,
  activeOrganizationId: string | null
): Promise<GateOk | GateNo> {
  const overrides = await loadMeteringOverrideFields(userId, activeOrganizationId);
  const limits = await getTowerLimitsSnapshot();
  const policy = resolveMeteringPolicyFromEntitlement(entitlement, overrides.user, overrides.organization, limits);
  if (policy.skipMetering || policy.imageCap === null) {
    return { ok: true, used: 0, limit: null, tier: entitlement.tier };
  }
  return runConsume(userId, "image", entitlement.tier, policy.imageCap);
}

type TxBlock = { blocked: true; used: number; limit: number } | { blocked: false; used: number; limit: number };

async function reserveMonthlyCount(
  tx: TowerDbTransaction,
  userId: string,
  ym: string,
  column: "webflow" | "image",
  cap: number
): Promise<TxBlock> {
  const lockKey = `${userId}|${ym}`;
  await tx.execute(sql`SELECT pg_advisory_xact_lock((hashtext(${lockKey}::text))::bigint)`);

  const rows = await tx
    .select()
    .from(towerUsageMonth)
    .where(and(eq(towerUsageMonth.userId, userId), eq(towerUsageMonth.yearMonth, ym)))
    .for("update");

  const row = rows[0];
  const current = column === "webflow" ? (row?.webflowRequestCount ?? 0) : (row?.imageOptimizeCount ?? 0);
  if (current >= cap) {
    return { blocked: true, used: current, limit: cap };
  }
  const next = current + 1;

  if (row) {
    const patch = column === "webflow" ? { webflowRequestCount: next } : { imageOptimizeCount: next };
    await tx
      .update(towerUsageMonth)
      .set(patch)
      .where(and(eq(towerUsageMonth.userId, userId), eq(towerUsageMonth.yearMonth, ym)));
  } else {
    await tx.insert(towerUsageMonth).values({
      userId,
      yearMonth: ym,
      webflowRequestCount: column === "webflow" ? 1 : 0,
      imageOptimizeCount: column === "image" ? 1 : 0,
    });
  }
  return { blocked: false, used: next, limit: cap };
}

async function runConsume(
  userId: string,
  column: "webflow" | "image",
  tier: TowerEntitlement["tier"],
  cap: number
): Promise<GateOk | GateNo> {
  const ym = utcYearMonth();
  const res = await db.transaction((tx) => reserveMonthlyCount(tx, userId, ym, column, cap));

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
            "Monthly usage limit reached for your plan. Upgrade to Pro in Tower, or try again after the month resets (UTC).",
          kind: column,
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
  webflowRequestCount: number;
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
    webflowRequestCount: row?.webflowRequestCount ?? 0,
    imageOptimizeCount: row?.imageOptimizeCount ?? 0,
  };
}

export async function resetUsageForUser(userId: string, yearMonth = utcYearMonth()): Promise<void> {
  await db
    .update(towerUsageMonth)
    .set({ webflowRequestCount: 0, imageOptimizeCount: 0 })
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
