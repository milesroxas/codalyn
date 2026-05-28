import type Stripe from "stripe";
import { auth } from "@/server/auth";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getStripe } from "@/server/billing/stripe-client";
import { getStripePricePro } from "@/server/billing/stripe-config";

export { getStripePricePro } from "@/server/billing/stripe-config";

export function isStripeCheckoutConfigured(): boolean {
  return Boolean(getStripe() && getStripePricePro());
}

type BillingRouteFailure = { ok: false; response: Response };
type BillingRouteSuccess = { ok: true; stripe: Stripe; userId: string };

export type StripeBillingSessionResult = BillingRouteFailure | BillingRouteSuccess;

/**
 * Shared gate for authenticated Stripe billing API routes (checkout, portal).
 */
export async function requireStripeBillingSession(request: Request): Promise<StripeBillingSessionResult> {
  if (!isTowerBillingEnabled()) {
    return { ok: false, response: Response.json({ error: "Billing is disabled" }, { status: 404 }) };
  }
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, response: Response.json({ error: "STRIPE_SECRET_KEY is not set" }, { status: 501 }) };
  }
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, stripe, userId };
}
