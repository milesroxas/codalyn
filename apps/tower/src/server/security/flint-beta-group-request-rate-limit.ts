import { assertPostgresRateLimit } from "@/server/security/rate-limit";
import { normalizeAccessEmail } from "@/shared/lib/access/email-input";

/**
 * Per-IP budget for the public Flint beta-group form (`/api/marketing/flint/beta-group-request`): no session,
 * no Turnstile, and every accepted request writes a row, e-mails the submitted address and notifies operators.
 * Same shape as the early-access form's budgets (`early-access-rate-limit.ts`).
 */
const FLINT_BETA_GROUP_REQUEST_IP_RATE_LIMIT = {
  maxAttempts: 10,
  windowSeconds: 600,
} as const;

/** Per-email budget: caps how often one address can be made the target of a confirmation e-mail. */
const FLINT_BETA_GROUP_REQUEST_EMAIL_RATE_LIMIT = {
  maxAttempts: 3,
  windowSeconds: 3600,
} as const;

/** Throttle by source IP. Safe to call before the body is parsed so malformed floods are capped too. */
export async function assertFlintBetaGroupRequestIpRateLimit(ip: string | null): Promise<void> {
  if (!ip) {
    return;
  }
  await assertPostgresRateLimit(`flint-beta-group-request:ip:${ip}`, FLINT_BETA_GROUP_REQUEST_IP_RATE_LIMIT);
}

/** Throttle by target email (normalized) so casing/whitespace variants share one budget. */
export async function assertFlintBetaGroupRequestEmailRateLimit(email: string): Promise<void> {
  await assertPostgresRateLimit(
    `flint-beta-group-request:email:${normalizeAccessEmail(email)}`,
    FLINT_BETA_GROUP_REQUEST_EMAIL_RATE_LIMIT
  );
}
