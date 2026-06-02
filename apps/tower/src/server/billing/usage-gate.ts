import { towerPlanBillingScope, type WebflowProxyUsageCategory } from "@codalyn/webflow-kit";
import { and, eq, sql } from "drizzle-orm";
import type { TowerEntitlement, TowerTier } from "@/server/billing/entitlements";
import {
  capForMeterKind,
  EMPTY_METERING_OVERRIDES,
  type MeteringOverrideFields,
  type MeterKind,
  reserveUnits,
  resolveMeteringPolicyFromEntitlement,
  utcYearMonth,
} from "@/server/billing/metering-policy";
import { getTeamMinSeats } from "@/server/billing/team-billing-config";
import { getTowerLimitsSnapshot } from "@/server/billing/tower-limits-config";
import { resolvePooledSeatCount } from "@/shared/lib/billing/organization-seat-cap";
import { db } from "@/shared/lib/db";
import { member, organization, towerUsageMonth, towerWorkspaceUsageMonth, user } from "@/shared/lib/db/auth-schema";

type TowerDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Where a meter is keyed: per individual user, or pooled across a paid Team workspace. */
export type UsageScope = { kind: "user"; userId: string } | { kind: "workspace"; organizationId: string };

/** Resolves whether a meter is enforced per-user or pooled across the active paid Team workspace. */
export function resolveUsageScope(tier: TowerTier, userId: string, activeOrganizationId: string | null): UsageScope {
  if (towerPlanBillingScope(tier) === "workspace" && activeOrganizationId) {
    return { kind: "workspace", organizationId: activeOrganizationId };
  }
  return { kind: "user", userId };
}

type GateOk = { ok: true; used: number; limit: number | null; tier: TowerEntitlement["tier"] };
type GateNo = { ok: false; used: number; limit: number; tier: TowerEntitlement["tier"]; response: Response };

type UsageCountPatch = Pick<
  typeof towerUsageMonth.$inferInsert,
  | "webflowProxyRequestCount"
  | "webflowProxyCmsSlotsCount"
  | "webflowProxyImageUploadCmsCount"
  | "cmsWriteCount"
  | "imageOptimizeCount"
>;

const METER_COUNT_FIELD: Record<MeterKind, keyof UsageCountPatch> = {
  webflowProxy: "webflowProxyRequestCount",
  cmsWrite: "cmsWriteCount",
  image: "imageOptimizeCount",
};

const WEBFLOW_PROXY_CATEGORY_FIELD: Record<WebflowProxyUsageCategory, keyof UsageCountPatch> = {
  cmsSlots: "webflowProxyCmsSlotsCount",
  imageUploadCms: "webflowProxyImageUploadCmsCount",
};

const METER_INSERT_DEFAULTS: UsageCountPatch = {
  webflowProxyRequestCount: 0,
  webflowProxyCmsSlotsCount: 0,
  webflowProxyImageUploadCmsCount: 0,
  cmsWriteCount: 0,
  imageOptimizeCount: 0,
};

const USAGE_COUNT_COLUMNS_USER = {
  webflowProxyRequestCount: towerUsageMonth.webflowProxyRequestCount,
  webflowProxyCmsSlotsCount: towerUsageMonth.webflowProxyCmsSlotsCount,
  webflowProxyImageUploadCmsCount: towerUsageMonth.webflowProxyImageUploadCmsCount,
  cmsWriteCount: towerUsageMonth.cmsWriteCount,
  imageOptimizeCount: towerUsageMonth.imageOptimizeCount,
} as const;

const USAGE_COUNT_COLUMNS_WORKSPACE = {
  webflowProxyRequestCount: towerWorkspaceUsageMonth.webflowProxyRequestCount,
  webflowProxyCmsSlotsCount: towerWorkspaceUsageMonth.webflowProxyCmsSlotsCount,
  webflowProxyImageUploadCmsCount: towerWorkspaceUsageMonth.webflowProxyImageUploadCmsCount,
  cmsWriteCount: towerWorkspaceUsageMonth.cmsWriteCount,
  imageOptimizeCount: towerWorkspaceUsageMonth.imageOptimizeCount,
} as const;

export type MeteringContext = {
  user: MeteringOverrideFields;
  organization: MeteringOverrideFields | null;
  /** Paid seats backing the active workspace's pooled Team cap (1 when no active workspace). */
  paidSeatCount: number;
};

export async function loadMeteringOverrideFields(
  userId: string,
  activeOrganizationId: string | null
): Promise<MeteringContext> {
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
    return { user: userFields, organization: null, paidSeatCount: 1 };
  }

  const [orgRow] = await db
    .select({
      meteringEnabled: organization.meteringEnabled,
      webflowProxyLimitOverride: organization.webflowProxyLimitOverride,
      cmsWriteLimitOverride: organization.cmsWriteLimitOverride,
      imageOptimizeLimitOverride: organization.imageOptimizeLimitOverride,
      stripeSeatQuantity: organization.stripeSeatQuantity,
      seatLimit: organization.seatLimit,
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
    paidSeatCount: orgRow
      ? resolvePooledSeatCount(
          { stripeSeatQuantity: orgRow.stripeSeatQuantity, seatLimit: orgRow.seatLimit },
          getTeamMinSeats()
        )
      : 1,
  };
}

/**
 * Reserves `units` (≥1) in a transaction. Returns 402 + JSON when the reservation exceeds the cap.
 */
async function consumeMeter(
  userId: string,
  entitlement: TowerEntitlement,
  activeOrganizationId: string | null,
  kind: MeterKind,
  units: number,
  webflowProxyCategory?: WebflowProxyUsageCategory
): Promise<GateOk | GateNo> {
  const overrides = await loadMeteringOverrideFields(userId, activeOrganizationId);
  const limits = await getTowerLimitsSnapshot();
  const policy = resolveMeteringPolicyFromEntitlement(entitlement, overrides.user, overrides.organization, limits, {
    billingScope: towerPlanBillingScope(entitlement.tier),
    paidSeatCount: overrides.paidSeatCount,
  });
  const cap = capForMeterKind(policy, kind);
  if (policy.skipMetering || cap === null) {
    return { ok: true, used: 0, limit: null, tier: entitlement.tier };
  }
  const scope = resolveUsageScope(entitlement.tier, userId, activeOrganizationId);
  return runConsume(scope, kind, entitlement.tier, cap, units, webflowProxyCategory);
}

export function consumeWebflowProxy(
  userId: string,
  entitlement: TowerEntitlement,
  activeOrganizationId: string | null,
  category: WebflowProxyUsageCategory
): Promise<GateOk | GateNo> {
  return consumeMeter(userId, entitlement, activeOrganizationId, "webflowProxy", 1, category);
}

export function consumeCmsWrite(
  userId: string,
  entitlement: TowerEntitlement,
  activeOrganizationId: string | null
): Promise<GateOk | GateNo> {
  return consumeMeter(userId, entitlement, activeOrganizationId, "cmsWrite", 1);
}

/**
 * Reserves image optimization **credits**. `credits` is the calculated cost of one optimize request
 * (see `calculateImageOptimizationCredits`); a request whose cost exceeds the remaining allowance is
 * blocked rather than partially charged.
 */
export function consumeImageOptimize(
  userId: string,
  entitlement: TowerEntitlement,
  activeOrganizationId: string | null,
  credits = 1
): Promise<GateOk | GateNo> {
  return consumeMeter(userId, entitlement, activeOrganizationId, "image", credits);
}

type TxBlock = { blocked: true; used: number; limit: number } | { blocked: false; used: number; limit: number };

type SelectedUsageCounts = UsageCountPatch | undefined;

/**
 * Locks and reserves against the meter row for the given scope (per-user or pooled per-workspace) within
 * a transaction. Both scopes share the same reservation decision; only the table and key column differ.
 */
async function reserveMonthlyCount(
  tx: TowerDbTransaction,
  scope: UsageScope,
  ym: string,
  kind: MeterKind,
  cap: number,
  units: number,
  webflowProxyCategory?: WebflowProxyUsageCategory
): Promise<TxBlock> {
  const scopeId = scope.kind === "user" ? scope.userId : scope.organizationId;
  const lockKey = `${scope.kind}|${scopeId}|${ym}|${kind}`;
  await tx.execute(sql`SELECT pg_advisory_xact_lock((hashtext(${lockKey}::text))::bigint)`);

  const countField = METER_COUNT_FIELD[kind];
  const categoryField =
    kind === "webflowProxy" && webflowProxyCategory != null ? WEBFLOW_PROXY_CATEGORY_FIELD[webflowProxyCategory] : null;
  const amount = Math.max(1, Math.trunc(units));

  const row = await selectUsageCountsForUpdate(tx, scope, ym);
  const current = row?.[countField] ?? 0;
  const decision = reserveUnits(current, cap, amount);
  if (decision.blocked) {
    return { blocked: true, used: decision.used, limit: cap };
  }
  const next = decision.used;
  const categoryCurrent = categoryField != null && row != null ? (row[categoryField] ?? 0) : 0;
  const categoryNext = categoryField != null ? categoryCurrent + amount : undefined;
  const patch: Partial<UsageCountPatch> = {
    [countField]: next,
    ...(categoryField != null && categoryNext != null ? { [categoryField]: categoryNext } : {}),
  };
  const insertCounts: UsageCountPatch = {
    ...METER_INSERT_DEFAULTS,
    [countField]: amount,
    ...(categoryField != null ? { [categoryField]: amount } : {}),
  };

  await writeUsageCounts(tx, scope, ym, Boolean(row), patch, insertCounts);
  return { blocked: false, used: next, limit: cap };
}

async function selectUsageCountsForUpdate(
  tx: TowerDbTransaction,
  scope: UsageScope,
  ym: string
): Promise<SelectedUsageCounts> {
  if (scope.kind === "user") {
    const rows = await tx
      .select(USAGE_COUNT_COLUMNS_USER)
      .from(towerUsageMonth)
      .where(and(eq(towerUsageMonth.userId, scope.userId), eq(towerUsageMonth.yearMonth, ym)))
      .for("update");
    return rows[0];
  }
  const rows = await tx
    .select(USAGE_COUNT_COLUMNS_WORKSPACE)
    .from(towerWorkspaceUsageMonth)
    .where(
      and(eq(towerWorkspaceUsageMonth.organizationId, scope.organizationId), eq(towerWorkspaceUsageMonth.yearMonth, ym))
    )
    .for("update");
  return rows[0];
}

async function writeUsageCounts(
  tx: TowerDbTransaction,
  scope: UsageScope,
  ym: string,
  rowExists: boolean,
  patch: Partial<UsageCountPatch>,
  insertCounts: UsageCountPatch
): Promise<void> {
  if (scope.kind === "user") {
    if (rowExists) {
      await tx
        .update(towerUsageMonth)
        .set(patch)
        .where(and(eq(towerUsageMonth.userId, scope.userId), eq(towerUsageMonth.yearMonth, ym)));
      return;
    }
    await tx.insert(towerUsageMonth).values({ userId: scope.userId, yearMonth: ym, ...insertCounts });
    return;
  }
  if (rowExists) {
    await tx
      .update(towerWorkspaceUsageMonth)
      .set(patch)
      .where(
        and(
          eq(towerWorkspaceUsageMonth.organizationId, scope.organizationId),
          eq(towerWorkspaceUsageMonth.yearMonth, ym)
        )
      );
    return;
  }
  await tx
    .insert(towerWorkspaceUsageMonth)
    .values({ organizationId: scope.organizationId, yearMonth: ym, ...insertCounts });
}

async function runConsume(
  scope: UsageScope,
  kind: MeterKind,
  tier: TowerEntitlement["tier"],
  cap: number,
  units: number,
  webflowProxyCategory?: WebflowProxyUsageCategory
): Promise<GateOk | GateNo> {
  const ym = utcYearMonth();
  const res = await db.transaction((tx) => reserveMonthlyCount(tx, scope, ym, kind, cap, units, webflowProxyCategory));

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
            "Monthly usage limit reached for your current plan. Upgrade in Tower billing, switch workspace, or try again after the month resets.",
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

export type UsageSnapshot = {
  yearMonth: string;
  webflowProxyRequestCount: number;
  webflowProxyCmsSlotsCount: number;
  webflowProxyImageUploadCmsCount: number;
  cmsWriteCount: number;
  imageOptimizeCount: number;
};

function toUsageSnapshot(ym: string, row: SelectedUsageCounts): UsageSnapshot {
  return {
    yearMonth: ym,
    webflowProxyRequestCount: row?.webflowProxyRequestCount ?? 0,
    webflowProxyCmsSlotsCount: row?.webflowProxyCmsSlotsCount ?? 0,
    webflowProxyImageUploadCmsCount: row?.webflowProxyImageUploadCmsCount ?? 0,
    cmsWriteCount: row?.cmsWriteCount ?? 0,
    imageOptimizeCount: row?.imageOptimizeCount ?? 0,
  };
}

export async function getUsageSnapshot(userId: string): Promise<UsageSnapshot> {
  const ym = utcYearMonth();
  const [row] = await db
    .select(USAGE_COUNT_COLUMNS_USER)
    .from(towerUsageMonth)
    .where(and(eq(towerUsageMonth.userId, userId), eq(towerUsageMonth.yearMonth, ym)))
    .limit(1);
  return toUsageSnapshot(ym, row);
}

/** Pooled monthly usage for a paid Team workspace (the shared pool enforced for all members). */
export async function getWorkspaceUsageSnapshot(organizationId: string): Promise<UsageSnapshot> {
  const ym = utcYearMonth();
  const [row] = await db
    .select(USAGE_COUNT_COLUMNS_WORKSPACE)
    .from(towerWorkspaceUsageMonth)
    .where(and(eq(towerWorkspaceUsageMonth.organizationId, organizationId), eq(towerWorkspaceUsageMonth.yearMonth, ym)))
    .limit(1);
  return toUsageSnapshot(ym, row);
}

/** Reads the meter snapshot for the active enforcement scope (per-user, or the pooled workspace). */
export function getUsageSnapshotForScope(scope: UsageScope): Promise<UsageSnapshot> {
  return scope.kind === "workspace" ? getWorkspaceUsageSnapshot(scope.organizationId) : getUsageSnapshot(scope.userId);
}

export async function resetUsageForUser(userId: string, yearMonth = utcYearMonth()): Promise<void> {
  await db
    .update(towerUsageMonth)
    .set({
      webflowProxyRequestCount: 0,
      webflowProxyCmsSlotsCount: 0,
      webflowProxyImageUploadCmsCount: 0,
      cmsWriteCount: 0,
      imageOptimizeCount: 0,
    })
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

  await Promise.all([
    resetUsageForWorkspace(organizationId, yearMonth),
    ...memberRows.map((row) => resetUsageForUser(row.userId, yearMonth)),
  ]);
}

/** Resets the pooled monthly usage for a paid Team workspace. */
export async function resetUsageForWorkspace(organizationId: string, yearMonth = utcYearMonth()): Promise<void> {
  await db
    .update(towerWorkspaceUsageMonth)
    .set({
      webflowProxyRequestCount: 0,
      webflowProxyCmsSlotsCount: 0,
      webflowProxyImageUploadCmsCount: 0,
      cmsWriteCount: 0,
      imageOptimizeCount: 0,
    })
    .where(
      and(
        eq(towerWorkspaceUsageMonth.organizationId, organizationId),
        eq(towerWorkspaceUsageMonth.yearMonth, yearMonth)
      )
    );
}
