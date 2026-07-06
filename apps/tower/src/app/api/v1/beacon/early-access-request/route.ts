import { handleEarlyAccessRequestPost } from "@/server/access/early-access-request-http";
import { assertBeaconEarlyAccessIpRateLimit } from "@/server/security/early-access-rate-limit";

/**
 * Beacon-facing early-access endpoint so the Designer extension can submit the form inline.
 * `/api/v1` responses get CORS headers from the middleware for Webflow extension origins;
 * `/api/account/*` responses are not readable cross-origin.
 *
 * Unlike Tower's `/api/account/request-early-access`, this surface never enforces Turnstile —
 * the extension iframe can't render the widget — so it relies on a stricter per-IP budget plus
 * the shared per-email budget.
 */
export async function POST(req: Request) {
  return handleEarlyAccessRequestPost(req, {
    assertIpRateLimit: assertBeaconEarlyAccessIpRateLimit,
    requireTurnstile: false,
  });
}
