import { eq } from "drizzle-orm";
import { requireStripeBillingSession } from "@/server/billing/stripe-billing-routes";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

export const runtime = "nodejs";

/**
 * Redirect to Stripe Customer Portal (manage/cancel subscription). Requires a Stripe customer id on the user.
 */
export async function GET(request: Request) {
  const gate = await requireStripeBillingSession(request);
  if (!gate.ok) {
    return gate.response;
  }
  const { stripe, userId } = gate;

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
