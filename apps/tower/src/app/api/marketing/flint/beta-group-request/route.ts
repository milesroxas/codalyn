import { NextResponse } from "next/server";
import { submitFlintBetaGroupRequest } from "@/server/marketing/flint-beta-group-request";
import { getClientIp } from "@/server/security/client-ip";
import {
  assertFlintBetaGroupRequestEmailRateLimit,
  assertFlintBetaGroupRequestIpRateLimit,
} from "@/server/security/flint-beta-group-request-rate-limit";
import { RateLimitError } from "@/server/security/rate-limit";

function rateLimitedResponse(): NextResponse {
  return NextResponse.json({ error: "rate_limited" }, { status: 429 });
}

/**
 * Public, unauthenticated form: every accepted request writes a row and sends two e-mails, so it carries
 * the same per-IP and per-address budgets as the early-access form (no Turnstile on this surface).
 */
export async function POST(req: Request) {
  try {
    await assertFlintBetaGroupRequestIpRateLimit(getClientIp(req));
  } catch (error) {
    if (error instanceof RateLimitError) {
      return rateLimitedResponse();
    }
    throw error;
  }

  const body = (await req.json().catch(() => null)) as {
    email?: unknown;
    firstName?: unknown;
    lastName?: unknown;
  } | null;

  try {
    if (typeof body?.email === "string" && body.email.trim().length > 0) {
      await assertFlintBetaGroupRequestEmailRateLimit(body.email);
    }
    const outcome = await submitFlintBetaGroupRequest({
      email: body?.email,
      firstName: body?.firstName,
      lastName: body?.lastName,
    });
    return NextResponse.json({ ok: true, outcome });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return rateLimitedResponse();
    }
    if (error instanceof Error && error.message === "invalid_email") {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }
    throw error;
  }
}
