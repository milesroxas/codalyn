import { NextResponse } from "next/server";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { submitEarlyAccessRequest } from "@/server/access/early-access-request";
import { getClientIp } from "@/server/security/client-ip";
import { assertEarlyAccessEmailRateLimit } from "@/server/security/early-access-rate-limit";
import { RateLimitError } from "@/server/security/rate-limit";
import { verifyTurnstileToken } from "@/server/security/verify-turnstile";
import { parseEarlyAccessRequestNameBody } from "@/shared/lib/access/early-access-request-name";
import { parseAccessEmailInput } from "@/shared/lib/access/email-input";
import { parseEarlyAccessReferralRequestInput } from "@/shared/lib/access/referral-source";

export type EarlyAccessRequestPostOptions = {
  /** Per-IP throttle for this surface; runs before the body is parsed so malformed floods are capped too. */
  assertIpRateLimit: (ip: string | null) => Promise<void>;
  /**
   * Whether this surface enforces Turnstile (when provisioned via `TURNSTILE_SECRET_KEY`). The
   * Beacon inline form runs inside the Webflow Designer extension iframe and cannot render the
   * widget, so it opts out and relies on its stricter per-IP budget instead.
   */
  requireTurnstile: boolean;
};

type EarlyAccessRequestBody = {
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  referralSource?: unknown;
  referralOther?: unknown;
  turnstileToken?: unknown;
} | null;

/** Normalizes the untrusted body into a submission, or a 400-able error code. */
function parseEarlyAccessSubmission(body: EarlyAccessRequestBody) {
  const email = parseAccessEmailInput(body?.email);
  if (!email) {
    return { error: "invalid_email" as const };
  }

  const referral = parseEarlyAccessReferralRequestInput({
    referralSource: body?.referralSource,
    referralOther: body?.referralOther,
  });
  if ("error" in referral) {
    return { error: referral.error };
  }

  const { firstName, lastName } = parseEarlyAccessRequestNameBody({
    firstName: body?.firstName,
    lastName: body?.lastName,
  });
  return { email, firstName, lastName, note: referral.note };
}

/** True when the surface doesn't enforce Turnstile, or the body's token passes verification. */
async function passesTurnstileGate(
  body: EarlyAccessRequestBody,
  ip: string | null,
  requireTurnstile: boolean
): Promise<boolean> {
  if (!requireTurnstile) {
    return true;
  }
  const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken : null;
  return verifyTurnstileToken(turnstileToken, ip);
}

/**
 * Shared POST handler behind both early-access surfaces (Tower `/api/account/request-early-access`
 * and Beacon `/api/v1/beacon/early-access-request`). Surfaces differ only in captcha enforcement
 * and per-IP budget; the per-email budget is shared across surfaces so a single victim address
 * can't be email-bombed by alternating between them.
 */
export async function handleEarlyAccessRequestPost(
  req: Request,
  options: EarlyAccessRequestPostOptions
): Promise<NextResponse> {
  if (!isTowerEarlyAccessGateEnabled()) {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  const ip = getClientIp(req);

  // Throttle by source before any work so scripted floods are capped even on malformed bodies.
  try {
    await options.assertIpRateLimit(ip);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    throw error;
  }

  const body = (await req.json().catch(() => null)) as EarlyAccessRequestBody;

  if (!(await passesTurnstileGate(body, ip, options.requireTurnstile))) {
    return NextResponse.json({ error: "captcha_failed" }, { status: 403 });
  }

  const submission = parseEarlyAccessSubmission(body);
  if ("error" in submission) {
    return NextResponse.json({ error: submission.error }, { status: 400 });
  }

  try {
    // Throttle per target address so a single victim can't be email-bombed across sources.
    await assertEarlyAccessEmailRateLimit(submission.email);
    const outcome = await submitEarlyAccessRequest(submission);
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
