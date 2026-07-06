import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { grantEarlyAccess } from "@/server/access/early-access";
import { auth } from "@/server/auth";
import { verifyOperatorCustomerInviteToken } from "@/server/operator-customer-invite-token";
import { claimOperatorInviteToken } from "@/server/security/operator-invite-single-use";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

/**
 * Signed-in user: redeem operator invite token (must match session email). Sets `canCreateOrganization`.
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const parsed = verifyOperatorCustomerInviteToken(token);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  if (session.user.email.trim().toLowerCase() !== parsed.email) {
    return NextResponse.json({ error: "email_mismatch" }, { status: 403 });
  }

  // Single-use: reject replay of an already-redeemed token by a different account. A retry by the
  // same user is idempotent (grants below are all idempotent), so it falls through to success.
  const claim = await claimOperatorInviteToken(token, session.user.id, parsed.email);
  if (claim === "already_by_other") {
    return NextResponse.json({ error: "already_redeemed" }, { status: 409 });
  }

  await db.update(user).set({ canCreateOrganization: true }).where(eq(user.id, session.user.id));
  await grantEarlyAccess(session.user.id);

  return NextResponse.json({ ok: true });
}
