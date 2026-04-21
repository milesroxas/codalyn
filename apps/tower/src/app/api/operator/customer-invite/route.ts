import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import {
  sendOperatorExistingUserTeamEligibleEmail,
  sendOperatorNewCustomerInviteEmail,
} from "@/server/email/operator-customer-invite-email";
import { isTowerProductAdmin } from "@/server/membership/product-admin";
import { signOperatorCustomerInviteToken } from "@/server/operator-customer-invite-token";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const email = raw.trim().toLowerCase();
  if (email.length < 3 || !email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    return null;
  }
  return email;
}

/**
 * Product operators: invite a customer email to sign up (with team-workspace eligibility) or
 * grant eligibility to an existing account. Sends email when Resend is configured.
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id || !isTowerProductAdmin(session.user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!email) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const inviterLabel = session.user.name?.trim() || session.user.email || "A Tower operator";

  const [existing] = await db.select({ id: user.id }).from(user).where(sql`lower(${user.email}) = ${email}`).limit(1);

  if (existing) {
    await db.update(user).set({ canCreateOrganization: true }).where(sql`lower(${user.email}) = ${email}`);
    await sendOperatorExistingUserTeamEligibleEmail({
      email,
      inviterLabel,
    });
    return NextResponse.json({ ok: true, kind: "existing_user" as const });
  }

  const token = signOperatorCustomerInviteToken(email);
  const base = resolveTowerPublicBaseUrl();
  const invitePath = `/sign-up?invite=${encodeURIComponent(token)}`;
  const inviteUrl = `${base}${invitePath}`;

  await sendOperatorNewCustomerInviteEmail({
    email,
    inviteUrl,
    inviterLabel,
  });

  return NextResponse.json({
    ok: true,
    kind: "new_user" as const,
    inviteUrl,
  });
}
