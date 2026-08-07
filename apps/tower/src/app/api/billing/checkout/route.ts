import { towerPlanName } from "@codalyn/webflow-kit";
import { eq } from "drizzle-orm";
import { requireStripeBillingSession } from "@/server/billing/stripe-billing-routes";
import { ensureStripeCustomerForUser } from "@/server/billing/stripe-customer";
import { stripePriceIdForIndividualPlan } from "@/server/billing/stripe-individual-plan";
import { STRIPE_BILLING_SCOPE_USER } from "@/server/billing/stripe-metadata";
import { type IndividualPaidPlan, userRowHasIndividualPaidPlan } from "@/server/billing/stripe-subscription-status";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

export const runtime = "nodejs";

/** Reads the requested user-scoped paid plan from a JSON or form POST body. Defaults to Pro. */
async function readRequestedPlan(request: Request): Promise<IndividualPaidPlan | "invalid"> {
  const contentType = request.headers.get("content-type") ?? "";
  let raw: unknown;
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { plan?: unknown } | null;
    raw = body?.plan;
  } else {
    const form = await request.formData().catch(() => null);
    raw = form?.get("plan") ?? undefined;
  }
  if (raw === undefined || raw === null || raw === "") {
    return "pro";
  }
  if (raw === "pro" || raw === "studio") {
    return raw;
  }
  return "invalid";
}

/**
 * Start Stripe Checkout for an individual paid plan (Pro or Studio). Requires a signed-in Tower user (POST only).
 * Configure `STRIPE_SECRET_KEY` and `STRIPE_PRICE_PRO` / `STRIPE_PRICE_STUDIO` in the environment.
 */
export async function POST(request: Request) {
  const gate = await requireStripeBillingSession(request);
  if (!gate.ok) {
    return gate.response;
  }
  const { stripe, userId } = gate;

  const plan = await readRequestedPlan(request);
  if (plan === "invalid") {
    return Response.json({ error: "Unsupported plan. Choose an individual plan (pro or studio)." }, { status: 400 });
  }

  const price = stripePriceIdForIndividualPlan(plan);
  if (!price) {
    const envVar = plan === "studio" ? "STRIPE_PRICE_STUDIO" : "STRIPE_PRICE_PRO";
    return Response.json(
      {
        error: `${envVar} is not set. Add your Stripe Price id (${towerPlanName(plan)} subscription) to the environment.`,
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

  if (userRowHasIndividualPaidPlan(u)) {
    return Response.json({ error: "You already have an active individual subscription." }, { status: 409 });
  }

  const customerId = await ensureStripeCustomerForUser(stripe, u);
  const base = resolveTowerPublicBaseUrl();

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    allow_promotion_codes: true,
    line_items: [{ price, quantity: 1 }],
    success_url: `${base}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/billing?checkout=canceled`,
    client_reference_id: u.id,
    metadata: { towerUserId: u.id, towerBillingScope: STRIPE_BILLING_SCOPE_USER },
    subscription_data: {
      metadata: { towerUserId: u.id, towerBillingScope: STRIPE_BILLING_SCOPE_USER },
    },
  });

  const url = checkout.url;
  if (!url) {
    return Response.json({ error: "No checkout URL from Stripe" }, { status: 500 });
  }
  return Response.redirect(url, 303);
}
