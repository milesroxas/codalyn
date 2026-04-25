import { and, eq, sql } from "drizzle-orm";
import type { TowerEntitlement, TowerTier } from "@/server/billing/entitlements";
import { meteringDisabled, TOWER_LIMITS } from "@/server/billing/limits";
import { db } from "@/shared/lib/db";
import { towerUsageMonth } from "@/shared/lib/db/auth-schema";

type TowerDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function utcYearMonth(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${m < 10 ? "0" : ""}${m}`;
}

function limitFor(kind: "webflow" | "image", tier: TowerTier): number {
  if (tier === "pro") {
    return kind === "webflow" ? TOWER_LIMITS.pro.webflowRequestsPerMonth : TOWER_LIMITS.pro.imageOptimizesPerMonth;
  }
  return kind === "webflow" ? TOWER_LIMITS.free.webflowRequestsPerMonth : TOWER_LIMITS.free.imageOptimizesPerMonth;
}

type GateOk = { ok: true; used: number; limit: number; tier: TowerTier };
type GateNo = { ok: false; used: number; limit: number; tier: TowerTier; response: Response };

/**
 * Reserves one unit in a transaction. Returns 429 + JSON when the cap is exceeded.
 */
export async function consumeWebflowRequest(userId: string, entitlement: TowerEntitlement): Promise<GateOk | GateNo> {
  if (meteringDisabled()) {
    return { ok: true, used: 0, limit: Number.POSITIVE_INFINITY, tier: entitlement.tier };
  }
  if (entitlement.tier === "pro") {
    return { ok: true, used: 0, limit: limitFor("webflow", "pro"), tier: "pro" };
  }
  const cap = limitFor("webflow", "free");
  return runConsume(userId, "webflow", "free", cap);
}

export async function consumeImageOptimize(userId: string, entitlement: TowerEntitlement): Promise<GateOk | GateNo> {
  if (meteringDisabled()) {
    return { ok: true, used: 0, limit: Number.POSITIVE_INFINITY, tier: entitlement.tier };
  }
  if (entitlement.tier === "pro") {
    return { ok: true, used: 0, limit: limitFor("image", "pro"), tier: "pro" };
  }
  const cap = limitFor("image", "free");
  return runConsume(userId, "image", "free", cap);
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
  tier: TowerTier,
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

/** Read-only: current month counts (no lock). */
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
