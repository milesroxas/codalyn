import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { countPendingEarlyAccessRequests } from "@/server/access/early-access-request";
import { countPendingFlintBetaGroupRequests } from "@/server/marketing/flint-beta-group-request";
import { requireProductAdmin } from "@/server/operator/require-product-admin";
import type { OperatorMetrics } from "@/server/operator/types";
import { countPendingSupportRequests } from "@/server/support/support-request";
import { db } from "@/shared/lib/db";
import {
  invitation,
  member,
  organization,
  organizationWebflowOAuthToken,
  session as sessionTable,
  user,
} from "@/shared/lib/db/auth-schema";

export const dynamic = "force-dynamic";

function toIso(d: Date | string | null | undefined): string {
  if (!d) {
    return new Date(0).toISOString();
  }
  const iso = typeof d === "string" ? new Date(d).toISOString() : d.toISOString();
  return iso;
}

export async function GET(): Promise<NextResponse<OperatorMetrics | { error: string }>> {
  const auth = await requireProductAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const now = new Date();
  const days7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    [{ total: totalUsers = 0 } = { total: 0 }],
    [{ total: totalAdmins = 0 } = { total: 0 }],
    [{ total: totalEligible = 0 } = { total: 0 }],
    [{ total: totalBanned = 0 } = { total: 0 }],
    [{ total: totalWorkspaces = 0 } = { total: 0 }],
    [{ total: totalInvitations = 0 } = { total: 0 }],
    [{ total: totalWebflowConnected = 0 } = { total: 0 }],
    [{ total: totalActiveSessions = 0 } = { total: 0 }],
    [{ total: signups7 = 0 } = { total: 0 }],
    [{ total: signups30 = 0 } = { total: 0 }],
    [{ total: workspaces30 = 0 } = { total: 0 }],
    pendingEarlyAccessRequests,
    pendingSupportRequests,
    pendingFlintBetaGroupRequests,
    recentUsers,
    recentWorkspacesRaw,
  ] = await Promise.all([
    db.select({ total: count() }).from(user),
    db.select({ total: count() }).from(user).where(eq(user.role, "product_admin")),
    db.select({ total: count() }).from(user).where(eq(user.canCreateOrganization, true)),
    db.select({ total: count() }).from(user).where(eq(user.banned, true)),
    db.select({ total: count() }).from(organization),
    db.select({ total: count() }).from(invitation).where(eq(invitation.status, "pending")),
    db.select({ total: count() }).from(organizationWebflowOAuthToken),
    db.select({ total: count() }).from(sessionTable).where(gt(sessionTable.expiresAt, now)),
    db.select({ total: count() }).from(user).where(gt(user.createdAt, days7)),
    db.select({ total: count() }).from(user).where(gt(user.createdAt, days30)),
    db.select({ total: count() }).from(organization).where(gt(organization.createdAt, days30)),
    countPendingEarlyAccessRequests(),
    countPendingSupportRequests(),
    countPendingFlintBetaGroupRequests(),
    db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .limit(6),
    db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
        memberCount: sql<number>`COALESCE((SELECT COUNT(*) FROM ${member} WHERE ${member.organizationId} = ${organization.id}), 0)`,
      })
      .from(organization)
      .orderBy(desc(organization.createdAt))
      .limit(6),
  ]);

  // Ensure TS knows we used `and` (keeps imports tree-shaken checker happy)
  void and;

  const payload: OperatorMetrics = {
    totals: {
      users: Number(totalUsers),
      productAdmins: Number(totalAdmins),
      eligibleForWorkspace: Number(totalEligible),
      banned: Number(totalBanned),
      workspaces: Number(totalWorkspaces),
      pendingInvitations: Number(totalInvitations),
      pendingEarlyAccessRequests: Number(pendingEarlyAccessRequests),
      pendingSupportRequests: Number(pendingSupportRequests),
      pendingFlintBetaGroupRequests: Number(pendingFlintBetaGroupRequests),
      webflowConnected: Number(totalWebflowConnected),
    },
    activity: {
      activeSessions: Number(totalActiveSessions),
      signupsLast7d: Number(signups7),
      signupsLast30d: Number(signups30),
      workspacesLast30d: Number(workspaces30),
    },
    recentUsers: recentUsers.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role ?? null,
      createdAt: toIso(r.createdAt),
    })),
    recentWorkspaces: recentWorkspacesRaw.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      memberCount: Number(r.memberCount ?? 0),
      createdAt: toIso(r.createdAt),
    })),
  };

  return NextResponse.json(payload);
}
