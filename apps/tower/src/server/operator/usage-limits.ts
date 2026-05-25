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

function mapUsageLimitsView(input: {
  scope: OperatorUsageLimitsView["scope"];
  tier: OperatorUsageLimitsView["tier"];
  meteringEnabled: boolean;
  globalMeteringDisabled: boolean;
  webflowRequestLimitOverride: number | null;
  imageOptimizeLimitOverride: number | null;
  yearMonth: string;
  webflowRequestCount: number;
  imageOptimizeCount: number;
  effectiveWebflowLimit: number | null;
  effectiveImageLimit: number | null;
  memberWebflowRequestCount?: number;
  memberImageOptimizeCount?: number;
}): OperatorUsageLimitsView {
  return input;
}

export async function fetchOperatorUserUsageLimits(userId: string): Promise<OperatorUsageLimitsView | null> {
  const [row] = await db
    .select({
      meteringEnabled: user.meteringEnabled,
      webflowRequestLimitOverride: user.webflowRequestLimitOverride,
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
    webflowRequestLimitOverride: row.webflowRequestLimitOverride ?? null,
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
    webflowRequestLimitOverride: userFields.webflowRequestLimitOverride,
    imageOptimizeLimitOverride: userFields.imageOptimizeLimitOverride,
    yearMonth: usage.yearMonth,
    webflowRequestCount: usage.webflowRequestCount,
    imageOptimizeCount: usage.imageOptimizeCount,
    effectiveWebflowLimit: policy.webflowCap,
    effectiveImageLimit: policy.imageCap,
  });
}

export async function fetchOperatorWorkspaceUsageLimits(orgId: string): Promise<OperatorUsageLimitsView | null> {
  const [row] = await db
    .select({
      meteringEnabled: organization.meteringEnabled,
      webflowRequestLimitOverride: organization.webflowRequestLimitOverride,
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
      webflowRequestCount: sql<number>`COALESCE(SUM(${towerUsageMonth.webflowRequestCount}), 0)`,
      imageOptimizeCount: sql<number>`COALESCE(SUM(${towerUsageMonth.imageOptimizeCount}), 0)`,
    })
    .from(member)
    .leftJoin(towerUsageMonth, and(eq(towerUsageMonth.userId, member.userId), eq(towerUsageMonth.yearMonth, ym)))
    .where(eq(member.organizationId, orgId));

  const orgFields = {
    meteringEnabled: Boolean(row.meteringEnabled),
    webflowRequestLimitOverride: row.webflowRequestLimitOverride ?? null,
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
    webflowRequestLimitOverride: orgFields.webflowRequestLimitOverride,
    imageOptimizeLimitOverride: orgFields.imageOptimizeLimitOverride,
    yearMonth: ym,
    webflowRequestCount: 0,
    imageOptimizeCount: 0,
    effectiveWebflowLimit: policy.webflowCap,
    effectiveImageLimit: policy.imageCap,
    memberWebflowRequestCount: Number(memberUsage?.webflowRequestCount ?? 0),
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

  if ("webflowRequestLimitOverride" in body) {
    const parsed = parseLimitOverrideField(body.webflowRequestLimitOverride);
    if (parsed === "invalid") {
      return { error: "invalid_webflowRequestLimitOverride" };
    }
    patch.webflowRequestLimitOverride = parsed;
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
  if (patch.webflowRequestLimitOverride !== undefined) {
    updates.webflowRequestLimitOverride = patch.webflowRequestLimitOverride;
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
    webflowRequestLimitOverride: null,
    imageOptimizeLimitOverride: null,
    yearMonth: ym,
    webflowRequestCount: 0,
    imageOptimizeCount: 0,
    effectiveWebflowLimit: policy.webflowCap,
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
    webflowRequestLimitOverride: null,
    imageOptimizeLimitOverride: null,
    yearMonth: ym,
    webflowRequestCount: 0,
    imageOptimizeCount: 0,
    effectiveWebflowLimit: policy.webflowCap,
    effectiveImageLimit: policy.imageCap,
    memberWebflowRequestCount: 0,
    memberImageOptimizeCount: 0,
  };
}
