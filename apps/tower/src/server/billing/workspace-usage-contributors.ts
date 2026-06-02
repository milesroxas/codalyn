import { and, eq } from "drizzle-orm";
import { utcYearMonth } from "@/server/billing/metering-policy";
import { db } from "@/shared/lib/db";
import { member, towerWorkspaceMemberUsageMonth, user } from "@/shared/lib/db/auth-schema";

/** One workspace member's attributed contribution to the pooled usage for a month. */
export type WorkspaceUsageContributor = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  /** `webflowProxy` meter ("Webflow updates"). */
  webflowProxyRequestCount: number;
  /** `image` meter (image optimization credits). */
  imageOptimizeCount: number;
  cmsWriteCount: number;
  /** Designer-API categories that make up `webflowProxyRequestCount`. */
  webflowProxyCmsSlotsCount: number;
  webflowProxyImageUploadCmsCount: number;
};

/** Displayed meters sum used only to order contributors (largest first). `cmsWrite` is not surfaced. */
function contributorDisplayTotal(contributor: WorkspaceUsageContributor): number {
  return contributor.webflowProxyRequestCount + contributor.imageOptimizeCount;
}

/**
 * Per-member contribution to a workspace's pooled usage this month, for the Team admin billing view.
 * Joins the org's members with their attribution rows (zero when a member has not contributed) and sorts
 * by displayed usage, largest first. Source of truth is `tower_workspace_member_usage_month`, which is
 * written alongside the pool on each team consume — so this only reflects pooled spend, not solo usage.
 */
export async function fetchWorkspaceUsageContributors(
  organizationId: string,
  yearMonth = utcYearMonth()
): Promise<WorkspaceUsageContributor[]> {
  const rows = await db
    .select({
      userId: member.userId,
      name: user.name,
      email: user.email,
      role: member.role,
      webflowProxyRequestCount: towerWorkspaceMemberUsageMonth.webflowProxyRequestCount,
      imageOptimizeCount: towerWorkspaceMemberUsageMonth.imageOptimizeCount,
      cmsWriteCount: towerWorkspaceMemberUsageMonth.cmsWriteCount,
      webflowProxyCmsSlotsCount: towerWorkspaceMemberUsageMonth.webflowProxyCmsSlotsCount,
      webflowProxyImageUploadCmsCount: towerWorkspaceMemberUsageMonth.webflowProxyImageUploadCmsCount,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .leftJoin(
      towerWorkspaceMemberUsageMonth,
      and(
        eq(towerWorkspaceMemberUsageMonth.organizationId, member.organizationId),
        eq(towerWorkspaceMemberUsageMonth.userId, member.userId),
        eq(towerWorkspaceMemberUsageMonth.yearMonth, yearMonth)
      )
    )
    .where(eq(member.organizationId, organizationId));

  return rows
    .map((row) => ({
      userId: row.userId,
      name: row.name ?? null,
      email: row.email ?? null,
      role: row.role,
      webflowProxyRequestCount: row.webflowProxyRequestCount ?? 0,
      imageOptimizeCount: row.imageOptimizeCount ?? 0,
      cmsWriteCount: row.cmsWriteCount ?? 0,
      webflowProxyCmsSlotsCount: row.webflowProxyCmsSlotsCount ?? 0,
      webflowProxyImageUploadCmsCount: row.webflowProxyImageUploadCmsCount ?? 0,
    }))
    .sort((a, b) => contributorDisplayTotal(b) - contributorDisplayTotal(a));
}
