import { NextResponse } from "next/server";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { submitEarlyAccessRequest } from "@/server/access/early-access-request";
import { getClientIp } from "@/server/security/client-ip";
import {
  assertEarlyAccessEmailRateLimit,
  assertEarlyAccessIpRateLimit,
} from "@/server/security/early-access-rate-limit";
import { RateLimitError } from "@/server/security/rate-limit";
import { verifyTurnstileToken } from "@/server/security/verify-turnstile";
import { parseEarlyAccessRequestNameBody } from "@/shared/lib/access/early-access-request-name";
import { parseAccessEmailInput } from "@/shared/lib/access/email-input";
import { parseEarlyAccessReferralRequestInput } from "@/shared/lib/access/referral-source";

export async function POST(req: Request) {
  if (!isTowerEarlyAccessGateEnabled()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  const ip = getClientIp(req);

  // Throttle by source before any work so scripted floods are capped even on malformed bodies.
  try {
    await assertEarlyAccessIpRateLimit(ip);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    throw error;
  }

  const body = (await req.json().catch(() => null)) as {
    email?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    referralSource?: unknown;
    referralOther?: unknown;
    turnstileToken?: unknown;
  } | null;

  const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken : null;
  if (!(await verifyTurnstileToken(turnstileToken, ip))) {
    return NextResponse.json({ error: "captcha_failed" }, { status: 403 });
  }

  const email = parseAccessEmailInput(body?.email);
  if (!email) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const referral = parseEarlyAccessReferralRequestInput({
    referralSource: body?.referralSource,
    referralOther: body?.referralOther,
  });
  if ("error" in referral) {
    return NextResponse.json({ error: referral.error }, { status: 400 });
  }

  const { firstName, lastName } = parseEarlyAccessRequestNameBody({
    firstName: body?.firstName,
    lastName: body?.lastName,
  });

  try {
    // Throttle per target address so a single victim can't be email-bombed across sources.
    await assertEarlyAccessEmailRateLimit(email);
    const outcome = await submitEarlyAccessRequest({ email, firstName, lastName, note: referral.note });
    return NextResponse.json({ ok: true, outcome });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    if (error instanceof Error && error.message === "gate_disabled") {
      return NextResponse.json({ error: "not_available" }, { status: 404 });
    }
    throw error;
  }
}
