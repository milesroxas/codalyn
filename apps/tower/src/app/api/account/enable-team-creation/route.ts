import { count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { isTowerProductAdmin } from "@/server/membership/product-admin";
import { db } from "@/shared/lib/db";
import { member, user } from "@/shared/lib/db/auth-schema";

/** Max time after account creation to opt into team workspace creation (signup flow only). */
const TEAM_SIGNUP_INTENT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Grants `canCreateOrganization` for the signed-in user when allowed:
 * - SaaS product admins: always
 * - Otherwise: no org memberships yet, within signup window (upgrade/billing will set the flag later)
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [row] = await db
    .select({
      id: user.id,
      canCreateOrganization: user.canCreateOrganization,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  if (row.canCreateOrganization) {
    return NextResponse.json({ ok: true, already: true });
  }

  if (isTowerProductAdmin(session.user)) {
    await db.update(user).set({ canCreateOrganization: true }).where(eq(user.id, userId));
    return NextResponse.json({ ok: true });
  }

  const [{ n: memberCount }] = await db.select({ n: count() }).from(member).where(eq(member.userId, userId));

  if (memberCount > 0) {
    return NextResponse.json({ error: "already_in_organization" }, { status: 403 });
  }

  const ageMs = Date.now() - row.createdAt.getTime();
  if (ageMs > TEAM_SIGNUP_INTENT_WINDOW_MS) {
    return NextResponse.json({ error: "team_creation_requires_upgrade" }, { status: 403 });
  }

  await db.update(user).set({ canCreateOrganization: true }).where(eq(user.id, userId));
  return NextResponse.json({ ok: true });
}
