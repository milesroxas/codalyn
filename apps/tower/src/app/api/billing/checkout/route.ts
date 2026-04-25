import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getStripe } from "@/server/billing/stripe-client";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

export const runtime = "nodejs";

const PRICE = process.env.STRIPE_PRICE_PRO?.trim();

/**
 * Start Stripe Checkout for individual Pro. Requires a signed-in Tower user.
 * Configure `STRIPE_SECRET_KEY` and `STRIPE_PRICE_PRO` (recurring price id) in the environment.
 */
export async function GET(request: Request) {
  if (!isTowerBillingEnabled()) {
    return Response.json({ error: "Billing is disabled" }, { status: 404 });
  }
  if (!PRICE) {
    return Response.json(
      { error: "STRIPE_PRICE_PRO is not set. Add your Stripe Price id (Pro subscription) to the environment." },
      { status: 501 }
    );
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
    .select({
      id: user.id,
      email: user.email,
      stripeCustomerId: user.stripeCustomerId,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!u) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const base = resolveTowerPublicBaseUrl();
  let customerId = u.stripeCustomerId;
  if (!customerId) {
    const c = await stripe.customers.create({
      email: u.email,
      metadata: { towerUserId: u.id },
    });
    customerId = c.id;
    await db.update(user).set({ stripeCustomerId: customerId }).where(eq(user.id, u.id));
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: PRICE, quantity: 1 }],
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
