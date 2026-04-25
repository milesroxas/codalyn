import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getStripe } from "@/server/billing/stripe-client";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

export const runtime = "nodejs";

/**
 * Redirect to Stripe Customer Portal (manage/cancel subscription). Requires a Stripe customer id on the user.
 */
export async function GET(request: Request) {
  if (!isTowerBillingEnabled()) {
    return Response.json({ error: "Billing is disabled" }, { status: 404 });
  }
  const stripe = getStripe();
  if (!stripe) {
    return Response.json({ error: "STRIPE_SECRET_KEY is not set" }, { status: 501 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [u] = await db
    .select({ stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!u?.stripeCustomerId) {
    return Response.json({ error: "No billing account yet. Use Checkout first." }, { status: 400 });
  }

  const base = resolveTowerPublicBaseUrl();
  const portal = await stripe.billingPortal.sessions.create({
    customer: u.stripeCustomerId,
    return_url: `${base}/billing`,
  });
  if (!portal.url) {
    return Response.json({ error: "No portal URL from Stripe" }, { status: 500 });
  }
  return Response.redirect(portal.url, 303);
}
