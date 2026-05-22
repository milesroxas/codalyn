import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { inviteCustomerForEarlyAccess } from "@/server/access/customer-early-access-invite";
import { parseAccessEmailInput } from "@/server/access/early-access";
import { syncEarlyAccessRequestForEmail } from "@/server/access/early-access-request";
import { auth } from "@/server/auth";
import { isTowerProductAdmin } from "@/server/membership/product-admin";

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
  const email = parseAccessEmailInput(body?.email);
  if (!email) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const inviterLabel = session.user.name?.trim() || session.user.email || "A Tower operator";
  const result = await inviteCustomerForEarlyAccess(email, inviterLabel);
  await syncEarlyAccessRequestForEmail(email, session.user.id);

  if (result.kind === "existing_user") {
    return NextResponse.json({ ok: true, kind: "existing_user" as const });
  }

  return NextResponse.json({
    ok: true,
    kind: "new_user" as const,
    inviteUrl: result.inviteUrl,
  });
}
