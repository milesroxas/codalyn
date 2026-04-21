import { and, count, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireProductAdmin } from "@/server/operator/require-product-admin";
import type { OperatorWorkspaceListResponse, OperatorWorkspaceRow } from "@/server/operator/types";
import { db } from "@/shared/lib/db";
import { invitation, member, organization } from "@/shared/lib/db/auth-schema";

export const dynamic = "force-dynamic";

function toIso(d: Date | string | null | undefined): string {
  if (!d) {
    return new Date(0).toISOString();
  }
  return typeof d === "string" ? new Date(d).toISOString() : d.toISOString();
}

export async function GET(req: Request): Promise<NextResponse<OperatorWorkspaceListResponse | { error: string }>> {
  const auth = await requireProductAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
  const plan = url.searchParams.get("billingPlan");
  const status = url.searchParams.get("subscriptionStatus");

  const conditions: SQL[] = [];
  if (q.length > 0) {
    const pat = `%${q}%`;
    const match = or(ilike(organization.name, pat), ilike(organization.slug, pat), ilike(organization.id, pat));
    if (match) {
      conditions.push(match);
    }
  }
  if (plan) {
    conditions.push(eq(organization.billingPlan, plan));
  }
  if (status) {
    conditions.push(eq(organization.subscriptionStatus, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        seatLimit: organization.seatLimit,
        billingPlan: organization.billingPlan,
        subscriptionStatus: organization.subscriptionStatus,
        stripeCustomerId: organization.stripeCustomerId,
        stripeSubscriptionId: organization.stripeSubscriptionId,
        createdAt: organization.createdAt,
        memberCount: sql<number>`COALESCE((SELECT COUNT(*) FROM ${member} WHERE ${member.organizationId} = ${organization.id}), 0)`,
        pendingInvitations: sql<number>`COALESCE((SELECT COUNT(*) FROM ${invitation} WHERE ${invitation.organizationId} = ${organization.id} AND ${invitation.status} = 'pending'), 0)`,
      })
      .from(organization)
      .where(whereClause)
      .orderBy(desc(organization.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(organization).where(whereClause),
  ]);

  const total = Number(totalRows[0]?.total ?? 0);
  const mapped: OperatorWorkspaceRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    logo: r.logo ?? null,
    seatLimit: r.seatLimit ?? null,
    billingPlan: r.billingPlan ?? null,
    subscriptionStatus: r.subscriptionStatus ?? null,
    stripeCustomerId: r.stripeCustomerId ?? null,
    stripeSubscriptionId: r.stripeSubscriptionId ?? null,
    memberCount: Number(r.memberCount ?? 0),
    pendingInvitations: Number(r.pendingInvitations ?? 0),
    createdAt: toIso(r.createdAt),
  }));

  return NextResponse.json({ rows: mapped, total, limit, offset });
}
