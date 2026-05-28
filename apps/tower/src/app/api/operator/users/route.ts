import { and, count, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { mapOperatorUserBillingFields } from "@/server/operator/operator-billing";
import { requireProductAdmin } from "@/server/operator/require-product-admin";
import type { OperatorUserListResponse, OperatorUserRow } from "@/server/operator/types";
import { defaultOperatorUserUsageLimits, fetchOperatorUserUsageLimits } from "@/server/operator/usage-limits";
import { db } from "@/shared/lib/db";
import { member, organizationWebflowOAuthToken, user } from "@/shared/lib/db/auth-schema";

export const dynamic = "force-dynamic";

function parseBoolFilter(v: string | null): boolean | undefined {
  if (v === "true") {
    return true;
  }
  if (v === "false") {
    return false;
  }
  return undefined;
}

function toIso(d: Date | string | null | undefined): string {
  if (!d) {
    return new Date(0).toISOString();
  }
  return typeof d === "string" ? new Date(d).toISOString() : d.toISOString();
}

type UserListFilters = {
  q: string;
  limit: number;
  offset: number;
  roleFilter: string | null;
  banned: boolean | undefined;
  eligible: boolean | undefined;
  verified: boolean | undefined;
};

function parseFilters(url: URL): UserListFilters {
  return {
    q: (url.searchParams.get("q") ?? "").trim(),
    limit: Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50))),
    offset: Math.max(0, Number(url.searchParams.get("offset") ?? 0)),
    roleFilter: url.searchParams.get("role"),
    banned: parseBoolFilter(url.searchParams.get("banned")),
    eligible: parseBoolFilter(url.searchParams.get("canCreateOrganization")),
    verified: parseBoolFilter(url.searchParams.get("emailVerified")),
  };
}

function buildWhere(f: UserListFilters): SQL | undefined {
  const conditions: SQL[] = [];
  if (f.q.length > 0) {
    const pat = `%${f.q}%`;
    const match = or(ilike(user.email, pat), ilike(user.name, pat), ilike(user.id, pat));
    if (match) {
      conditions.push(match);
    }
  }
  if (f.roleFilter === "user") {
    const e = or(eq(user.role, "user"), sql`${user.role} IS NULL`);
    if (e) {
      conditions.push(e);
    }
  } else if (f.roleFilter === "product_admin") {
    conditions.push(eq(user.role, "product_admin"));
  }
  if (f.banned !== undefined) {
    conditions.push(eq(user.banned, f.banned));
  }
  if (f.eligible !== undefined) {
    conditions.push(eq(user.canCreateOrganization, f.eligible));
  }
  if (f.verified !== undefined) {
    conditions.push(eq(user.emailVerified, f.verified));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function GET(req: Request): Promise<NextResponse<OperatorUserListResponse | { error: string }>> {
  const auth = await requireProductAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const filters = parseFilters(new URL(req.url));
  const { limit, offset } = filters;
  const whereClause = buildWhere(filters);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        banned: user.banned,
        banReason: user.banReason,
        banExpires: user.banExpires,
        canCreateOrganization: user.canCreateOrganization,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        webflowConnected: sql<boolean>`EXISTS(SELECT 1 FROM ${member} m INNER JOIN ${organizationWebflowOAuthToken} w ON w."organization_id" = m."organization_id" WHERE m."user_id" = "user"."id")`,
        memberships: sql<number>`COALESCE((SELECT COUNT(*) FROM ${member} m WHERE m."user_id" = "user"."id"), 0)`,
      })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(user).where(whereClause),
  ]);

  const total = Number(totalRows[0]?.total ?? 0);
  const usageByUserId = new Map(
    (
      await Promise.all(
        rows.map(async (r) => {
          const usage = await fetchOperatorUserUsageLimits(r.id);
          return [r.id, usage] as const;
        })
      )
    ).filter((entry): entry is readonly [string, NonNullable<(typeof entry)[1]>] => entry[1] !== null)
  );

  const mapped: OperatorUserRow[] = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role ?? null,
      emailVerified: Boolean(r.emailVerified),
      banned: Boolean(r.banned),
      banReason: r.banReason ?? null,
      banExpires: r.banExpires ? toIso(r.banExpires) : null,
      canCreateOrganization: Boolean(r.canCreateOrganization),
      ...mapOperatorUserBillingFields({
        subscriptionPlan: r.subscriptionPlan ?? null,
        subscriptionStatus: r.subscriptionStatus ?? null,
        stripeCustomerId: r.stripeCustomerId ?? null,
        stripeSubscriptionId: r.stripeSubscriptionId ?? null,
      }),
      webflowConnected: Boolean(r.webflowConnected),
      memberships: Number(r.memberships ?? 0),
      usage: usageByUserId.get(r.id) ?? (await defaultOperatorUserUsageLimits()),
      createdAt: toIso(r.createdAt),
      updatedAt: toIso(r.updatedAt),
    }))
  );

  return NextResponse.json({ rows: mapped, total, limit, offset });
}
