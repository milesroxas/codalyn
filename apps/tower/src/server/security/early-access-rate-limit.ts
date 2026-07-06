import { assertPostgresRateLimit } from "@/server/security/rate-limit";
import { normalizeAccessEmail } from "@/shared/lib/access/email-input";

/** Per-IP budget for the unauthenticated early-access form: throttles scripted floods from one source. */
const EARLY_ACCESS_IP_RATE_LIMIT = {
  maxAttempts: 10,
  windowSeconds: 600,
} as const;

/**
 * Per-email budget: caps how often any single victim address can be targeted (confirmation email to
 * the address + operator notification), independent of source IP.
 */
const EARLY_ACCESS_EMAIL_RATE_LIMIT = {
  maxAttempts: 3,
  windowSeconds: 3600,
} as const;

/** Throttle by source IP. Safe to call before the body is parsed so malformed floods are capped too. */
export async function assertEarlyAccessIpRateLimit(ip: string | null): Promise<void> {
  if (!ip) {
    return;
  }
  await assertPostgresRateLimit(`early-access:ip:${ip}`, EARLY_ACCESS_IP_RATE_LIMIT);
}

/** Throttle by target email (normalized) so the same victim can't be bombed via unique casing/whitespace. */
export async function assertEarlyAccessEmailRateLimit(email: string): Promise<void> {
  await assertPostgresRateLimit(`early-access:email:${normalizeAccessEmail(email)}`, EARLY_ACCESS_EMAIL_RATE_LIMIT);
}
