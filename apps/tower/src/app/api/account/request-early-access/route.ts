import { handleEarlyAccessRequestPost } from "@/server/access/early-access-request-http";
import { assertEarlyAccessIpRateLimit } from "@/server/security/early-access-rate-limit";

/**
 * Tower's `/request-access` form endpoint. Enforces Turnstile when provisioned — the Tower page
 * renders the widget — on top of the shared IP/email budgets.
 */
export async function POST(req: Request) {
  return handleEarlyAccessRequestPost(req, {
    assertIpRateLimit: assertEarlyAccessIpRateLimit,
    requireTurnstile: true,
  });
}
