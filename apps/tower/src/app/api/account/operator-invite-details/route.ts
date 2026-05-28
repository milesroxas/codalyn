import { NextResponse } from "next/server";
import { lookupEarlyAccessRequestProfileByEmail } from "@/server/access/early-access-request";
import { verifyOperatorCustomerInviteToken } from "@/server/operator-customer-invite-token";

/**
 * Public: returns the invited email for a valid operator invite token (for sign-up prefill).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }
  const parsed = verifyOperatorCustomerInviteToken(token);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  const profile = await lookupEarlyAccessRequestProfileByEmail(parsed.email);
  return NextResponse.json({
    email: parsed.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
  });
}
