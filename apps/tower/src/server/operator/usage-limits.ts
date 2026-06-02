import { towerPlanBillingScope } from "@codalyn/webflow-kit";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  EMPTY_METERING_OVERRIDES,
  parseLimitOverrideField,
  resolveMeteringPolicy,
  utcYearMonth,
} from "@/server/billing/metering-policy";
import { isOrganizationTeamEntitled } from "@/server/billing/organization-billing";
import { resolveUserIndividualPlan } from "@/server/billing/stripe-individual-pro";
import { getTeamMinSeats } from "@/server/billing/team-billing-config";
import { getTowerLimitsSnapshot } from "@/server/billing/tower-limits-config";
import { getUsageSnapshot, resetUsageForOrganizationMembers, resetUsageForUser } from "@/server/billing/usage-gate";
import type { OperatorUsageLimitsPatch, OperatorUsageLimitsView } from "@/server/operator/types";
import { resolvePooledSeatCount } from "@/shared/lib/billing/organization-seat-cap";
import { db } from "@/shared/lib/db";
import {
  member,
  organization,
  towerWorkspaceMemberUsageMonth,
  towerWorkspaceUsageMonth,
  user,
} from "@/shared/lib/db/auth-schema";

type WorkspacePoolCounts = { webflowProxyRequestCount: number; cmsWriteCount: number; imageOptimizeCount: number };

const EMPTY_WORKSPACE_POOL: WorkspacePoolCounts = {
  webflowProxyRequestCount: 0,
  cmsWriteCount: 0,
  imageOptimizeCount: 0,
};

function mapUsageLimitsView(input: OperatorUsageLimitsView): OperatorUsageLimitsView {
  return input;
}

export async function fetchOperatorUserUsageLimits(userId: string): Promise<OperatorUsageLimitsView | null> {
  const [row] = await db
    .select({
      meteringEnabled: user.meteringEnabled,
      webflowProxyLimitOverride: user.webflowProxyLimitOverride,
      cmsWriteLimitOverride: user.cmsWriteLimitOverride,
      imageOptimizeLimitOverride: user.imageOptimizeLimitOverride,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      stripeSubscriptionId: user.stripeSubscriptionId,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row) {
    return null;
  }

  const usage = await getUsageSnapshot(userId);
  const limits = await getTowerLimitsSnapshot();
  const userFields = {
    meteringEnabled: Boolean(row.meteringEnabled),
    webflowProxyLimitOverride: row.webflowProxyLimitOverride ?? null,
    cmsWriteLimitOverride: row.cmsWriteLimitOverride ?? null,
    imageOptimizeLimitOverride: row.imageOptimizeLimitOverride ?? null,
  };
  // Operator user view reflects the individual account (no active-workspace context), so the
  // effective caps must follow the user's own Pro/Studio subscription, matching enforcement.
  const individualPlan = await resolveUserIndividualPlan({
    subscriptionPlan: row.subscriptionPlan,
    subscriptionStatus: row.subscriptionStatus,
    stripeSubscriptionId: row.stripeSubscriptionId,
  });
  const userTier = individualPlan ?? "free";
  const policy = resolveMeteringPolicy({
    tier: userTier,
    user: userFields,
    organization: null,
    limits,
  });

  return mapUsageLimitsView({
    scope: "user",
    tier: userTier,
    meteringEnabled: userFields.meteringEnabled,
    globalMeteringDisabled: policy.globalMeteringDisabled,
    webflowProxyLimitOverride: userFields.webflowProxyLimitOverride,
    cmsWriteLimitOverride: userFields.cmsWriteLimitOverride,
    imageOptimizeLimitOverride: userFields.imageOptimizeLimitOverride,
    yearMonth: usage.yearMonth,
    webflowProxyRequestCount: usage.webflowProxyRequestCount,
    cmsWriteCount: usage.cmsWriteCount,
    imageOptimizeCount: usage.imageOptimizeCount,
    effectiveWebflowProxyLimit: policy.webflowProxyCap,
    effectiveCmsWriteLimit: policy.cmsWriteCap,
    effectiveImageLimit: policy.imageCap,
  });
}

export async function fetchOperatorWorkspaceUsageLimits(orgId: string): Promise<OperatorUsageLimitsView | null> {
  const [row] = await db
    .select({
      meteringEnabled: organization.meteringEnabled,
      webflowProxyLimitOverride: organization.webflowProxyLimitOverride,
      cmsWriteLimitOverride: organization.cmsWriteLimitOverride,
      imageOptimizeLimitOverride: organization.imageOptimizeLimitOverride,
      subscriptionStatus: organization.subscriptionStatus,
      billingPlan: organization.billingPlan,
      stripeSubscriptionId: organization.stripeSubscriptionId,
      stripeSeatQuantity: organization.stripeSeatQuantity,
      seatLimit: organization.seatLimit,
    })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (!row) {
    return null;
  }

  const ym = utcYearMonth();
  const [memberUsage] = await db
    .select({
      webflowProxyRequestCount: sql<number>`COALESCE(SUM(${towerWorkspaceMemberUsageMonth.webflowProxyRequestCount}), 0)`,
      cmsWriteCount: sql<number>`COALESCE(SUM(${towerWorkspaceMemberUsageMonth.cmsWriteCount}), 0)`,
      imageOptimizeCount: sql<number>`COALESCE(SUM(${towerWorkspaceMemberUsageMonth.imageOptimizeCount}), 0)`,
    })
    .from(member)
    .leftJoin(
      towerWorkspaceMemberUsageMonth,
      and(
        eq(towerWorkspaceMemberUsageMonth.organizationId, member.organizationId),
        eq(towerWorkspaceMemberUsageMonth.userId, member.userId),
        eq(towerWorkspaceMemberUsageMonth.yearMonth, ym)
      )
    )
    .where(eq(member.organizationId, orgId));

  const orgFields = {
    meteringEnabled: Boolean(row.meteringEnabled),
    webflowProxyLimitOverride: row.webflowProxyLimitOverride ?? null,
    cmsWriteLimitOverride: row.cmsWriteLimitOverride ?? null,
    imageOptimizeLimitOverride: row.imageOptimizeLimitOverride ?? null,
  };
  const workspaceTier = isOrganizationTeamEntitled({
    subscriptionStatus: row.subscriptionStatus,
    billingPlan: row.billingPlan,
    stripeSubscriptionId: row.stripeSubscriptionId,
  })
    ? ("team" as const)
    : ("free" as const);
  const paidSeatCount =
    workspaceTier === "team"
      ? resolvePooledSeatCount(
          { stripeSeatQuantity: row.stripeSeatQuantity, seatLimit: row.seatLimit },
          getTeamMinSeats()
        )
      : 1;
  const limits = await getTowerLimitsSnapshot();
  const policy = resolveMeteringPolicy({
    tier: workspaceTier,
    user: EMPTY_METERING_OVERRIDES,
    organization: orgFields,
    limits,
    billingScope: towerPlanBillingScope(workspaceTier),
    paidSeatCount,
  });
  const pool = workspaceTier === "team" ? await fetchWorkspacePoolCounts(orgId, ym) : EMPTY_WORKSPACE_POOL;

  return mapUsageLimitsView({
    scope: "workspace",
    tier: workspaceTier,
    meteringEnabled: orgFields.meteringEnabled,
    globalMeteringDisabled: policy.globalMeteringDisabled,
    webflowProxyLimitOverride: orgFields.webflowProxyLimitOverride,
    cmsWriteLimitOverride: orgFields.cmsWriteLimitOverride,
    imageOptimizeLimitOverride: orgFields.imageOptimizeLimitOverride,
    yearMonth: ym,
    webflowProxyRequestCount: pool.webflowProxyRequestCount,
    cmsWriteCount: pool.cmsWriteCount,
    imageOptimizeCount: pool.imageOptimizeCount,
    effectiveWebflowProxyLimit: policy.webflowProxyCap,
    effectiveCmsWriteLimit: policy.cmsWriteCap,
    effectiveImageLimit: policy.imageCap,
    memberWebflowProxyRequestCount: Number(memberUsage?.webflowProxyRequestCount ?? 0),
    memberCmsWriteCount: Number(memberUsage?.cmsWriteCount ?? 0),
    memberImageOptimizeCount: Number(memberUsage?.imageOptimizeCount ?? 0),
  });
}

/** Pooled Team usage counts for a single workspace this month (0 when no pool row exists yet). */
async function fetchWorkspacePoolCounts(orgId: string, ym: string): Promise<WorkspacePoolCounts> {
  const [poolRow] = await db
    .select({
      webflowProxyRequestCount: towerWorkspaceUsageMonth.webflowProxyRequestCount,
      cmsWriteCount: towerWorkspaceUsageMonth.cmsWriteCount,
      imageOptimizeCount: towerWorkspaceUsageMonth.imageOptimizeCount,
    })
    .from(towerWorkspaceUsageMonth)
    .where(and(eq(towerWorkspaceUsageMonth.organizationId, orgId), eq(towerWorkspaceUsageMonth.yearMonth, ym)))
    .limit(1);
  return {
    webflowProxyRequestCount: poolRow?.webflowProxyRequestCount ?? 0,
    cmsWriteCount: poolRow?.cmsWriteCount ?? 0,
    imageOptimizeCount: poolRow?.imageOptimizeCount ?? 0,
  };
}

/** Batch workspace usage for operator lists (one org query + one aggregated usage query). */
export async function fetchOperatorWorkspaceUsageLimitsBatch(
  orgIds: string[]
): Promise<Map<string, OperatorUsageLimitsView>> {
  const result = new Map<string, OperatorUsageLimitsView>();
  if (orgIds.length === 0) {
    return result;
  }

  const ym = utcYearMonth();
  const [orgRows, memberUsageRows, poolRows] = await Promise.all([
    db
      .select({
        id: organization.id,
        meteringEnabled: organization.meteringEnabled,
        webflowProxyLimitOverride: organization.webflowProxyLimitOverride,
        cmsWriteLimitOverride: organization.cmsWriteLimitOverride,
        imageOptimizeLimitOverride: organization.imageOptimizeLimitOverride,
        subscriptionStatus: organization.subscriptionStatus,
        billingPlan: organization.billingPlan,
        stripeSubscriptionId: organization.stripeSubscriptionId,
        stripeSeatQuantity: organization.stripeSeatQuantity,
        seatLimit: organization.seatLimit,
      })
      .from(organization)
      .where(inArray(organization.id, orgIds)),
    db
      .select({
        organizationId: member.organizationId,
        webflowProxyRequestCount: sql<number>`COALESCE(SUM(${towerWorkspaceMemberUsageMonth.webflowProxyRequestCount}), 0)`,
        cmsWriteCount: sql<number>`COALESCE(SUM(${towerWorkspaceMemberUsageMonth.cmsWriteCount}), 0)`,
        imageOptimizeCount: sql<number>`COALESCE(SUM(${towerWorkspaceMemberUsageMonth.imageOptimizeCount}), 0)`,
      })
      .from(member)
      .leftJoin(
        towerWorkspaceMemberUsageMonth,
        and(
          eq(towerWorkspaceMemberUsageMonth.organizationId, member.organizationId),
          eq(towerWorkspaceMemberUsageMonth.userId, member.userId),
          eq(towerWorkspaceMemberUsageMonth.yearMonth, ym)
        )
      )
      .where(inArray(member.organizationId, orgIds))
      .groupBy(member.organizationId),
    db
      .select({
        organizationId: towerWorkspaceUsageMonth.organizationId,
        webflowProxyRequestCount: towerWorkspaceUsageMonth.webflowProxyRequestCount,
        cmsWriteCount: towerWorkspaceUsageMonth.cmsWriteCount,
        imageOptimizeCount: towerWorkspaceUsageMonth.imageOptimizeCount,
      })
      .from(towerWorkspaceUsageMonth)
      .where(and(inArray(towerWorkspaceUsageMonth.organizationId, orgIds), eq(towerWorkspaceUsageMonth.yearMonth, ym))),
  ]);

  const usageByOrgId = new Map(
    memberUsageRows.map((row) => [
      row.organizationId,
      {
        webflowProxyRequestCount: Number(row.webflowProxyRequestCount ?? 0),
        cmsWriteCount: Number(row.cmsWriteCount ?? 0),
        imageOptimizeCount: Number(row.imageOptimizeCount ?? 0),
      },
    ])
  );
  const poolByOrgId = new Map<string, WorkspacePoolCounts>(
    poolRows.map((row) => [
      row.organizationId,
      {
        webflowProxyRequestCount: row.webflowProxyRequestCount ?? 0,
        cmsWriteCount: row.cmsWriteCount ?? 0,
        imageOptimizeCount: row.imageOptimizeCount ?? 0,
      },
    ])
  );

  const limits = await getTowerLimitsSnapshot();

  for (const row of orgRows) {
    const orgFields = {
      meteringEnabled: Boolean(row.meteringEnabled),
      webflowProxyLimitOverride: row.webflowProxyLimitOverride ?? null,
      cmsWriteLimitOverride: row.cmsWriteLimitOverride ?? null,
      imageOptimizeLimitOverride: row.imageOptimizeLimitOverride ?? null,
    };
    const workspaceTier = isOrganizationTeamEntitled({
      subscriptionStatus: row.subscriptionStatus,
      billingPlan: row.billingPlan,
      stripeSubscriptionId: row.stripeSubscriptionId,
    })
      ? ("team" as const)
      : ("free" as const);
    const paidSeatCount =
      workspaceTier === "team"
        ? resolvePooledSeatCount(
            { stripeSeatQuantity: row.stripeSeatQuantity, seatLimit: row.seatLimit },
            getTeamMinSeats()
          )
        : 1;
    const policy = resolveMeteringPolicy({
      tier: workspaceTier,
      user: EMPTY_METERING_OVERRIDES,
      organization: orgFields,
      limits,
      billingScope: towerPlanBillingScope(workspaceTier),
      paidSeatCount,
    });
    const memberUsage = usageByOrgId.get(row.id);
    const pool = workspaceTier === "team" ? (poolByOrgId.get(row.id) ?? EMPTY_WORKSPACE_POOL) : EMPTY_WORKSPACE_POOL;

    result.set(
      row.id,
      mapUsageLimitsView({
        scope: "workspace",
        tier: workspaceTier,
        meteringEnabled: orgFields.meteringEnabled,
        globalMeteringDisabled: policy.globalMeteringDisabled,
        webflowProxyLimitOverride: orgFields.webflowProxyLimitOverride,
        cmsWriteLimitOverride: orgFields.cmsWriteLimitOverride,
        imageOptimizeLimitOverride: orgFields.imageOptimizeLimitOverride,
        yearMonth: ym,
        webflowProxyRequestCount: pool.webflowProxyRequestCount,
        cmsWriteCount: pool.cmsWriteCount,
        imageOptimizeCount: pool.imageOptimizeCount,
        effectiveWebflowProxyLimit: policy.webflowProxyCap,
        effectiveCmsWriteLimit: policy.cmsWriteCap,
        effectiveImageLimit: policy.imageCap,
        memberWebflowProxyRequestCount: memberUsage?.webflowProxyRequestCount ?? 0,
        memberCmsWriteCount: memberUsage?.cmsWriteCount ?? 0,
        memberImageOptimizeCount: memberUsage?.imageOptimizeCount ?? 0,
      })
    );
  }

  return result;
}

export function sanitizeUsageLimitsPatch(raw: unknown): OperatorUsageLimitsPatch | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "invalid_body" };
  }
  const body = raw as Record<string, unknown>;
  const patch: OperatorUsageLimitsPatch = {};

  if ("meteringEnabled" in body) {
    if (typeof body.meteringEnabled !== "boolean") {
      return { error: "invalid_meteringEnabled" };
    }
    patch.meteringEnabled = body.meteringEnabled;
  }

  if ("webflowProxyLimitOverride" in body) {
    const parsed = parseLimitOverrideField(body.webflowProxyLimitOverride);
    if (parsed === "invalid") {
      return { error: "invalid_webflowProxyLimitOverride" };
    }
    patch.webflowProxyLimitOverride = parsed;
  }

  if ("cmsWriteLimitOverride" in body) {
    const parsed = parseLimitOverrideField(body.cmsWriteLimitOverride);
    if (parsed === "invalid") {
      return { error: "invalid_cmsWriteLimitOverride" };
    }
    patch.cmsWriteLimitOverride = parsed;
  }

  if ("imageOptimizeLimitOverride" in body) {
    const parsed = parseLimitOverrideField(body.imageOptimizeLimitOverride);
    if (parsed === "invalid") {
      return { error: "invalid_imageOptimizeLimitOverride" };
    }
    patch.imageOptimizeLimitOverride = parsed;
  }

  return patch;
}

export function usageLimitsPatchToDbUpdates(patch: OperatorUsageLimitsPatch): Record<string, boolean | number | null> {
  const updates: Record<string, boolean | number | null> = {};
  if (patch.meteringEnabled !== undefined) {
    updates.meteringEnabled = patch.meteringEnabled;
  }
  if (patch.webflowProxyLimitOverride !== undefined) {
    updates.webflowProxyLimitOverride = patch.webflowProxyLimitOverride;
  }
  if (patch.cmsWriteLimitOverride !== undefined) {
    updates.cmsWriteLimitOverride = patch.cmsWriteLimitOverride;
  }
  if (patch.imageOptimizeLimitOverride !== undefined) {
    updates.imageOptimizeLimitOverride = patch.imageOptimizeLimitOverride;
  }
  return updates;
}

export async function resetOperatorUserUsage(userId: string): Promise<void> {
  await resetUsageForUser(userId);
}

export async function resetOperatorWorkspaceMemberUsage(orgId: string): Promise<void> {
  await resetUsageForOrganizationMembers(orgId);
}

export async function defaultOperatorUserUsageLimits(): Promise<OperatorUsageLimitsView> {
  const ym = utcYearMonth();
  const limits = await getTowerLimitsSnapshot();
  const policy = resolveMeteringPolicy({
    tier: "free",
    user: EMPTY_METERING_OVERRIDES,
    organization: null,
    limits,
  });
  return {
    scope: "user",
    tier: "free",
    meteringEnabled: true,
    globalMeteringDisabled: policy.globalMeteringDisabled,
    webflowProxyLimitOverride: null,
    cmsWriteLimitOverride: null,
    imageOptimizeLimitOverride: null,
    yearMonth: ym,
    webflowProxyRequestCount: 0,
    cmsWriteCount: 0,
    imageOptimizeCount: 0,
    effectiveWebflowProxyLimit: policy.webflowProxyCap,
    effectiveCmsWriteLimit: policy.cmsWriteCap,
    effectiveImageLimit: policy.imageCap,
  };
}

export async function defaultOperatorWorkspaceUsageLimits(): Promise<OperatorUsageLimitsView> {
  const ym = utcYearMonth();
  const limits = await getTowerLimitsSnapshot();
  const policy = resolveMeteringPolicy({
    tier: "free",
    user: EMPTY_METERING_OVERRIDES,
    organization: EMPTY_METERING_OVERRIDES,
    limits,
  });
  return {
    scope: "workspace",
    tier: "free",
    meteringEnabled: true,
    globalMeteringDisabled: policy.globalMeteringDisabled,
    webflowProxyLimitOverride: null,
    cmsWriteLimitOverride: null,
    imageOptimizeLimitOverride: null,
    yearMonth: ym,
    webflowProxyRequestCount: 0,
    cmsWriteCount: 0,
    imageOptimizeCount: 0,
    effectiveWebflowProxyLimit: policy.webflowProxyCap,
    effectiveCmsWriteLimit: policy.cmsWriteCap,
    effectiveImageLimit: policy.imageCap,
    memberWebflowProxyRequestCount: 0,
    memberCmsWriteCount: 0,
    memberImageOptimizeCount: 0,
  };
}
