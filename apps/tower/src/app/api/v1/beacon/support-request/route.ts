import { auth } from "@/server/auth";
import { getClientIp } from "@/server/security/client-ip";
import { RateLimitError } from "@/server/security/rate-limit";
import {
  assertBeaconSupportRequestIpRateLimit,
  assertSupportRequestEmailRateLimit,
} from "@/server/security/support-request-rate-limit";
import { submitSupportRequest } from "@/server/support/support-request";
import { verifyTowerApiRequest } from "@/server/tower-api-auth";
import { parseAccessEmailInput } from "@/shared/lib/access/email-input";

export const runtime = "nodejs";

type SupportRequestBody = {
  kind?: unknown;
  topic?: unknown;
  details?: unknown;
  email?: unknown;
};

async function resolveAuthenticatedSupportEmail(
  req: Request,
  userId: string
): Promise<{ email: string; userId: string } | { error: "unauthorized" }> {
  const session = await auth.api.getSession({ headers: req.headers });
  const sessionUser = session?.user;
  const sessionUserId = sessionUser?.id ?? null;
  if (!sessionUserId || sessionUserId !== userId || !sessionUser) {
    return { error: "unauthorized" };
  }
  const email = parseAccessEmailInput(sessionUser.email);
  if (!email) {
    return { error: "unauthorized" };
  }
  return { email, userId };
}

function rateLimited(): Response {
  return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "600" } });
}

/** Runs a rate-limit assertion, mapping {@link RateLimitError} to a 429 and rethrowing anything else. */
async function guardRateLimit(assertion: () => Promise<void>): Promise<Response | null> {
  try {
    await assertion();
    return null;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return rateLimited();
    }
    throw error;
  }
}

/**
 * Unauthenticated (signed-out Designer) path: no session, no Turnstile (the extension iframe cannot
 * render the widget), so per-IP + per-email budgets are the abuse control for DB rows + admin email.
 */
async function resolveUnauthenticatedSupportEmail(
  req: Request,
  body: SupportRequestBody | null
): Promise<{ email: string } | { response: Response }> {
  const ipLimited = await guardRateLimit(() => assertBeaconSupportRequestIpRateLimit(getClientIp(req)));
  if (ipLimited) {
    return { response: ipLimited };
  }
  const email = parseAccessEmailInput(body?.email);
  if (!email) {
    return { response: Response.json({ error: "invalid_email" }, { status: 400 }) };
  }
  const emailLimited = await guardRateLimit(() => assertSupportRequestEmailRateLimit(email));
  if (emailLimited) {
    return { response: emailLimited };
  }
  return { email };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SupportRequestBody | null;
  const verified = await verifyTowerApiRequest(req);

  let email: string | null = null;
  let userId: string | null = null;

  if (verified.ok && verified.userId) {
    const resolved = await resolveAuthenticatedSupportEmail(req, verified.userId);
    if ("error" in resolved) {
      return Response.json({ error: resolved.error }, { status: 401 });
    }
    email = resolved.email;
    userId = resolved.userId;
  } else {
    const resolved = await resolveUnauthenticatedSupportEmail(req, body);
    if ("response" in resolved) {
      return resolved.response;
    }
    email = resolved.email;
  }

  try {
    const result = await submitSupportRequest({
      kind: body?.kind,
      topic: body?.topic,
      details: body?.details,
      email,
      userId,
    });
    return Response.json({ ok: true, id: result.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "invalid_kind" ||
        error.message === "invalid_email" ||
        error.message === "invalid_topic" ||
        error.message === "invalid_details"
      ) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    }
    throw error;
  }
}
