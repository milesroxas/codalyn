import { eq } from "drizzle-orm";
import { getStripePricePro, requireStripeBillingSession } from "@/server/billing/stripe-billing-routes";
import { ensureStripeCustomerForUser } from "@/server/billing/stripe-customer";
import { userRowHasStripePro } from "@/server/billing/stripe-subscription-status";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

export const runtime = "nodejs";

/**
 * Start Stripe Checkout for individual Pro. Requires a signed-in Tower user (POST only).
 * Configure `STRIPE_SECRET_KEY` and `STRIPE_PRICE_PRO` (recurring price id) in the environment.
 */
export async function POST(request: Request) {
  const gate = await requireStripeBillingSession(request);
  if (!gate.ok) {
    return gate.response;
  }
  const { stripe, userId } = gate;

  const price = getStripePricePro();
  if (!price) {
    return Response.json(
      {
        error: "STRIPE_PRICE_PRO is not set. Add your Stripe Price id (Pro subscription) to the environment.",
      },
      { status: 501 }
    );
  }

  const [u] = await db
    .select({
      id: user.id,
      email: user.email,
      stripeCustomerId: user.stripeCustomerId,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      stripeSubscriptionId: user.stripeSubscriptionId,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!u) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if (userRowHasStripePro(u)) {
    return Response.json({ error: "You already have an active Pro subscription." }, { status: 409 });
  }

  const customerId = await ensureStripeCustomerForUser(stripe, u);
  const base = resolveTowerPublicBaseUrl();

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${base}/billing?checkout=success`,
    cancel_url: `${base}/billing?checkout=canceled`,
    client_reference_id: u.id,
    metadata: { towerUserId: u.id },
    subscription_data: {
      metadata: { towerUserId: u.id },
    },
  });

  const url = checkout.url;
  if (!url) {
    return Response.json({ error: "No checkout URL from Stripe" }, { status: 500 });
  }
  return Response.redirect(url, 303);
}
