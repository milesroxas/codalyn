import { and, eq, sql } from "drizzle-orm";
import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import {
  EMPTY_METERING_OVERRIDES,
  parseLimitOverrideField,
  resolveMeteringPolicy,
  utcYearMonth,
} from "@/server/billing/metering-policy";
import { getTowerLimitsSnapshot } from "@/server/billing/tower-limits-config";
import { getUsageSnapshot, resetUsageForOrganizationMembers, resetUsageForUser } from "@/server/billing/usage-gate";
import type { OperatorUsageLimitsPatch, OperatorUsageLimitsView } from "@/server/operator/types";
import { db } from "@/shared/lib/db";
import { member, organization, towerUsageMonth, user } from "@/shared/lib/db/auth-schema";

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
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row) {
    return null;
  }

  const entitlement = await resolveTowerEntitlement(userId, null);
  const usage = await getUsageSnapshot(userId);
  const limits = await getTowerLimitsSnapshot();
  const userFields = {
    meteringEnabled: Boolean(row.meteringEnabled),
    webflowProxyLimitOverride: row.webflowProxyLimitOverride ?? null,
    cmsWriteLimitOverride: row.cmsWriteLimitOverride ?? null,
    imageOptimizeLimitOverride: row.imageOptimizeLimitOverride ?? null,
  };
  const policy = resolveMeteringPolicy({
    tier: entitlement.tier,
    user: userFields,
    organization: null,
    limits,
  });

  return mapUsageLimitsView({
    scope: "user",
    tier: entitlement.tier,
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
      webflowProxyRequestCount: sql<number>`COALESCE(SUM(${towerUsageMonth.webflowProxyRequestCount}), 0)`,
      cmsWriteCount: sql<number>`COALESCE(SUM(${towerUsageMonth.cmsWriteCount}), 0)`,
      imageOptimizeCount: sql<number>`COALESCE(SUM(${towerUsageMonth.imageOptimizeCount}), 0)`,
    })
    .from(member)
    .leftJoin(towerUsageMonth, and(eq(towerUsageMonth.userId, member.userId), eq(towerUsageMonth.yearMonth, ym)))
    .where(eq(member.organizationId, orgId));

  const orgFields = {
    meteringEnabled: Boolean(row.meteringEnabled),
    webflowProxyLimitOverride: row.webflowProxyLimitOverride ?? null,
    cmsWriteLimitOverride: row.cmsWriteLimitOverride ?? null,
    imageOptimizeLimitOverride: row.imageOptimizeLimitOverride ?? null,
  };
  const limits = await getTowerLimitsSnapshot();
  const policy = resolveMeteringPolicy({
    tier: "free",
    user: EMPTY_METERING_OVERRIDES,
    organization: orgFields,
    limits,
  });

  return mapUsageLimitsView({
    scope: "workspace",
    tier: "free",
    meteringEnabled: orgFields.meteringEnabled,
    globalMeteringDisabled: policy.globalMeteringDisabled,
    webflowProxyLimitOverride: orgFields.webflowProxyLimitOverride,
    cmsWriteLimitOverride: orgFields.cmsWriteLimitOverride,
    imageOptimizeLimitOverride: orgFields.imageOptimizeLimitOverride,
    yearMonth: ym,
    webflowProxyRequestCount: 0,
    cmsWriteCount: 0,
    imageOptimizeCount: 0,
    effectiveWebflowProxyLimit: policy.webflowProxyCap,
    effectiveCmsWriteLimit: policy.cmsWriteCap,
    effectiveImageLimit: policy.imageCap,
    memberWebflowProxyRequestCount: Number(memberUsage?.webflowProxyRequestCount ?? 0),
    memberCmsWriteCount: Number(memberUsage?.cmsWriteCount ?? 0),
    memberImageOptimizeCount: Number(memberUsage?.imageOptimizeCount ?? 0),
  });
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
