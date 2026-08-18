import { assertPostgresRateLimit } from "@/server/security/rate-limit";
import { normalizeAccessEmail } from "@/shared/lib/access/email-input";

/**
 * Per-IP budget for Beacon's unauthenticated support form (`/api/v1/beacon/support-request` without a
 * Tower session). The Designer extension iframe cannot render Turnstile, so this budget is the only
 * automated-abuse control on that surface: every accepted request writes a DB row and emails admins.
 */
const BEACON_SUPPORT_REQUEST_IP_RATE_LIMIT = {
  maxAttempts: 5,
  windowSeconds: 600,
} as const;

/** Per-email budget: caps how often one (unverified) address can be attached to support spam. */
const SUPPORT_REQUEST_EMAIL_RATE_LIMIT = {
  maxAttempts: 5,
  windowSeconds: 3600,
} as const;

/** Throttle by source IP. Safe to call before the body is parsed so malformed floods are capped too. */
export async function assertBeaconSupportRequestIpRateLimit(ip: string | null): Promise<void> {
  if (!ip) {
    return;
  }
  await assertPostgresRateLimit(`support-request:beacon:ip:${ip}`, BEACON_SUPPORT_REQUEST_IP_RATE_LIMIT);
}

/** Throttle by target email (normalized) so casing/whitespace variants share one budget. */
export async function assertSupportRequestEmailRateLimit(email: string): Promise<void> {
  await assertPostgresRateLimit(
    `support-request:email:${normalizeAccessEmail(email)}`,
    SUPPORT_REQUEST_EMAIL_RATE_LIMIT
  );
}
