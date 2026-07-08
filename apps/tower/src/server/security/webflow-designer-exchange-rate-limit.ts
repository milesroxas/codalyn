import { assertPostgresRateLimit } from "@/server/security/rate-limit";

/**
 * Per-IP budget for the unauthenticated Designer ID-token exchange (`/api/auth/webflow-designer`).
 * Legit traffic is ~1 exchange per extension load plus a short client retry ladder, so this caps
 * token-guessing floods against the Webflow resolve endpoint without pinching agency NATs where
 * several designers share an IP.
 */
const WEBFLOW_DESIGNER_EXCHANGE_IP_RATE_LIMIT = {
  maxAttempts: 60,
  windowSeconds: 600,
} as const;

/** Throttle by source IP. Safe to call before the body is parsed so malformed floods are capped too. */
export async function assertWebflowDesignerExchangeIpRateLimit(ip: string | null): Promise<void> {
  if (!ip) {
    return;
  }
  await assertPostgresRateLimit(`webflow-designer-exchange:ip:${ip}`, WEBFLOW_DESIGNER_EXCHANGE_IP_RATE_LIMIT);
}
