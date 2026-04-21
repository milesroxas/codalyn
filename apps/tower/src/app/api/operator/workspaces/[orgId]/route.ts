import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireProductAdmin } from "@/server/operator/require-product-admin";
import type { OperatorWorkspaceDetail, OperatorWorkspacePatch } from "@/server/operator/types";
import { db } from "@/shared/lib/db";
import { invitation, member, organization, user } from "@/shared/lib/db/auth-schema";

export const dynamic = "force-dynamic";

function toIso(d: Date | string | null | undefined): string {
  if (!d) {
    return new Date(0).toISOString();
  }
  return typeof d === "string" ? new Date(d).toISOString() : d.toISOString();
}

async function fetchWorkspaceDetail(orgId: string): Promise<OperatorWorkspaceDetail | null> {
  const [row] = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      metadata: organization.metadata,
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
    .where(eq(organization.id, orgId))
    .limit(1);

  if (!row) {
    return null;
  }

  const [memberRows, invitationRows] = await Promise.all([
    db
      .select({
        memberId: member.id,
        userId: member.userId,
        email: user.email,
        name: user.name,
        role: member.role,
        beaconRestrictToEditorExperience: member.beaconRestrictToEditorExperience,
        createdAt: member.createdAt,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, orgId))
      .orderBy(desc(member.createdAt)),
    db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        inviterEmail: user.email,
      })
      .from(invitation)
      .leftJoin(user, eq(invitation.inviterId, user.id))
      .where(eq(invitation.organizationId, orgId))
      .orderBy(desc(invitation.createdAt)),
  ]);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo ?? null,
    metadata: row.metadata ?? null,
    seatLimit: row.seatLimit ?? null,
    billingPlan: row.billingPlan ?? null,
    subscriptionStatus: row.subscriptionStatus ?? null,
    stripeCustomerId: row.stripeCustomerId ?? null,
    stripeSubscriptionId: row.stripeSubscriptionId ?? null,
    memberCount: Number(row.memberCount ?? 0),
    pendingInvitations: Number(row.pendingInvitations ?? 0),
    createdAt: toIso(row.createdAt),
    members: memberRows.map((m) => ({
      memberId: m.memberId,
      userId: m.userId,
      email: m.email,
      name: m.name,
      role: m.role,
      beaconRestrictToEditorExperience: Boolean(m.beaconRestrictToEditorExperience),
      createdAt: toIso(m.createdAt),
    })),
    invitations: invitationRows.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role ?? null,
      status: i.status,
      expiresAt: toIso(i.expiresAt),
      createdAt: toIso(i.createdAt),
      inviterEmail: i.inviterEmail ?? null,
    })),
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orgId: string }> }
): Promise<NextResponse<OperatorWorkspaceDetail | { error: string }>> {
  const authRes = await requireProductAdmin();
  if (!authRes.ok) {
    return authRes.response;
  }
  const { orgId } = await ctx.params;
  const detail = await fetchWorkspaceDetail(orgId);
  if (!detail) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

function applyNameField(body: Record<string, unknown>, patch: OperatorWorkspacePatch): string | null {
  if (!("name" in body)) {
    return null;
  }
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return "invalid_name";
  }
  patch.name = body.name.trim();
  return null;
}

function applySlugField(body: Record<string, unknown>, patch: OperatorWorkspacePatch): string | null {
  if (!("slug" in body)) {
    return null;
  }
  if (typeof body.slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(body.slug)) {
    return "invalid_slug";
  }
  patch.slug = body.slug;
  return null;
}

function applySeatLimitField(body: Record<string, unknown>, patch: OperatorWorkspacePatch): string | null {
  if (!("seatLimit" in body)) {
    return null;
  }
  const v = body.seatLimit;
  if (v !== null && (typeof v !== "number" || !Number.isFinite(v) || v < 1 || v > 100000)) {
    return "invalid_seatLimit";
  }
  patch.seatLimit = (v as number | null) ?? null;
  return null;
}

function applyNullableStringField(
  body: Record<string, unknown>,
  patch: OperatorWorkspacePatch,
  key: "billingPlan" | "subscriptionStatus"
): string | null {
  if (!(key in body)) {
    return null;
  }
  const v = body[key];
  if (v !== null && typeof v !== "string") {
    return `invalid_${key}`;
  }
  patch[key] = (v as string | null) ?? null;
  return null;
}

function sanitizePatch(raw: unknown): OperatorWorkspacePatch | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "invalid_body" };
  }
  const body = raw as Record<string, unknown>;
  const patch: OperatorWorkspacePatch = {};
  const err =
    applyNameField(body, patch) ??
    applySlugField(body, patch) ??
    applySeatLimitField(body, patch) ??
    applyNullableStringField(body, patch, "billingPlan") ??
    applyNullableStringField(body, patch, "subscriptionStatus");
  if (err) {
    return { error: err };
  }
  return patch;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ orgId: string }> }
): Promise<NextResponse<OperatorWorkspaceDetail | { error: string }>> {
  const authRes = await requireProductAdmin();
  if (!authRes.ok) {
    return authRes.response;
  }
  const { orgId } = await ctx.params;
  const raw = (await req.json().catch(() => null)) as unknown;
  const parsed = sanitizePatch(raw);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const updates: Record<string, unknown> = { ...parsed };
  if (Object.keys(updates).length > 0) {
    await db.update(organization).set(updates).where(eq(organization.id, orgId));
  }
  const detail = await fetchWorkspaceDetail(orgId);
  if (!detail) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ orgId: string }> }
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const authRes = await requireProductAdmin();
  if (!authRes.ok) {
    return authRes.response;
  }
  const { orgId } = await ctx.params;
  const url = new URL(req.url);
  const confirm = (url.searchParams.get("confirm") ?? "").toLowerCase();

  const [target] = await db
    .select({ slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (confirm !== target.slug.toLowerCase()) {
    return NextResponse.json({ error: "confirm_mismatch" }, { status: 400 });
  }

  await db.delete(organization).where(eq(organization.id, orgId));
  return NextResponse.json({ ok: true });
}
