import { and, desc, eq, gt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { requireProductAdmin } from "@/server/operator/require-product-admin";
import type { OperatorUserDetail, OperatorUserPatch } from "@/server/operator/types";
import { db } from "@/shared/lib/db";
import { member, organization, session as sessionTable, user, webflowOAuthToken } from "@/shared/lib/db/auth-schema";

export const dynamic = "force-dynamic";

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) {
    return null;
  }
  return typeof d === "string" ? new Date(d).toISOString() : d.toISOString();
}

async function fetchUserDetail(userId: string): Promise<OperatorUserDetail | null> {
  const [row] = await db
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
      image: user.image,
      webflowAuthorizedUserId: user.webflowAuthorizedUserId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row) {
    return null;
  }

  const [memberRows, sessionRows, webflowConnected] = await Promise.all([
    db
      .select({
        memberId: member.id,
        organizationId: member.organizationId,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        role: member.role,
        createdAt: member.createdAt,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, userId))
      .orderBy(desc(member.createdAt)),
    db
      .select({
        id: sessionTable.id,
        createdAt: sessionTable.createdAt,
        updatedAt: sessionTable.updatedAt,
        expiresAt: sessionTable.expiresAt,
        ipAddress: sessionTable.ipAddress,
        userAgent: sessionTable.userAgent,
      })
      .from(sessionTable)
      .where(and(eq(sessionTable.userId, userId), gt(sessionTable.expiresAt, new Date())))
      .orderBy(desc(sessionTable.updatedAt)),
    db.select({ exists: sql<boolean>`1` }).from(webflowOAuthToken).where(eq(webflowOAuthToken.userId, userId)).limit(1),
  ]);

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role ?? null,
    emailVerified: Boolean(row.emailVerified),
    banned: Boolean(row.banned),
    banReason: row.banReason ?? null,
    banExpires: toIso(row.banExpires),
    canCreateOrganization: Boolean(row.canCreateOrganization),
    image: row.image ?? null,
    webflowAuthorizedUserId: row.webflowAuthorizedUserId ?? null,
    webflowConnected: webflowConnected.length > 0,
    memberships: memberRows.length,
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date(0).toISOString(),
    memberOf: memberRows.map((m) => ({
      memberId: m.memberId,
      organizationId: m.organizationId,
      organizationName: m.organizationName,
      organizationSlug: m.organizationSlug,
      role: m.role,
      createdAt: toIso(m.createdAt) ?? new Date(0).toISOString(),
    })),
    activeSessions: sessionRows.map((s) => ({
      id: s.id,
      createdAt: toIso(s.createdAt) ?? new Date(0).toISOString(),
      updatedAt: toIso(s.updatedAt),
      expiresAt: toIso(s.expiresAt) ?? new Date(0).toISOString(),
      ipAddress: s.ipAddress ?? null,
      userAgent: s.userAgent ?? null,
    })),
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> }
): Promise<NextResponse<OperatorUserDetail | { error: string }>> {
  const authRes = await requireProductAdmin();
  if (!authRes.ok) {
    return authRes.response;
  }
  const { userId } = await ctx.params;
  const detail = await fetchUserDetail(userId);
  if (!detail) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

function applyRoleField(body: Record<string, unknown>, patch: OperatorUserPatch): string | null {
  if (!("role" in body)) {
    return null;
  }
  const r = body.role;
  if (r === null || r === "user" || r === "product_admin") {
    patch.role = r;
    return null;
  }
  return "invalid_role";
}

function applyBooleanField(
  body: Record<string, unknown>,
  patch: OperatorUserPatch,
  key: "canCreateOrganization" | "banned"
): string | null {
  if (!(key in body)) {
    return null;
  }
  if (typeof body[key] !== "boolean") {
    return `invalid_${key}`;
  }
  patch[key] = body[key] as boolean;
  return null;
}

function applyNullableStringField(
  body: Record<string, unknown>,
  patch: OperatorUserPatch,
  key: "banReason" | "banExpires"
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

function sanitizePatch(raw: unknown): OperatorUserPatch | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "invalid_body" };
  }
  const body = raw as Record<string, unknown>;
  const patch: OperatorUserPatch = {};
  const err =
    applyRoleField(body, patch) ??
    applyBooleanField(body, patch, "canCreateOrganization") ??
    applyBooleanField(body, patch, "banned") ??
    applyNullableStringField(body, patch, "banReason") ??
    applyNullableStringField(body, patch, "banExpires");
  if (err) {
    return { error: err };
  }
  return patch;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ userId: string }> }
): Promise<NextResponse<OperatorUserDetail | { error: string }>> {
  const authRes = await requireProductAdmin();
  if (!authRes.ok) {
    return authRes.response;
  }
  const { userId } = await ctx.params;
  const raw = (await req.json().catch(() => null)) as unknown;
  const parsed = sanitizePatch(raw);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (userId === authRes.user.id && parsed.role !== undefined && parsed.role !== "product_admin") {
    return NextResponse.json({ error: "cannot_demote_self" }, { status: 400 });
  }
  if (userId === authRes.user.id && parsed.banned === true) {
    return NextResponse.json({ error: "cannot_ban_self" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.role !== undefined) {
    updates.role = parsed.role;
  }
  if (parsed.canCreateOrganization !== undefined) {
    updates.canCreateOrganization = parsed.canCreateOrganization;
  }
  if (parsed.banned !== undefined) {
    updates.banned = parsed.banned;
  }
  if (parsed.banReason !== undefined) {
    updates.banReason = parsed.banReason;
  }
  if (parsed.banExpires !== undefined) {
    updates.banExpires = parsed.banExpires ? new Date(parsed.banExpires) : null;
  }

  if (Object.keys(updates).length > 0) {
    await db.update(user).set(updates).where(eq(user.id, userId));
  }

  const detail = await fetchUserDetail(userId);
  if (!detail) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ userId: string }> }
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const authRes = await requireProductAdmin();
  if (!authRes.ok) {
    return authRes.response;
  }
  const { userId } = await ctx.params;
  if (userId === authRes.user.id) {
    return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });
  }
  const url = new URL(req.url);
  const confirm = (url.searchParams.get("confirm") ?? "").toLowerCase();

  const [target] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (confirm !== target.email.toLowerCase()) {
    return NextResponse.json({ error: "confirm_mismatch" }, { status: 400 });
  }

  try {
    await auth.api.removeUser({
      body: { userId },
      headers: await headers(),
    });
  } catch {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
