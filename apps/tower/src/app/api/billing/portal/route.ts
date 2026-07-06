import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { requireStripeBillingSession } from "@/server/billing/stripe-billing-routes";
import { stripePriceIdForIndividualPlan } from "@/server/billing/stripe-individual-plan";
import {
  buildStripePortalFlowData,
  parseStripePortalFlowParams,
  type StripePortalFlowRequest,
} from "@/server/billing/stripe-portal-flows";
import { userRowIndividualPlan } from "@/server/billing/stripe-subscription-status";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

export const runtime = "nodejs";

type PortalUserRow = {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
};

/**
 * Resolves `flow_data` for a requested deep link, or a Response describing why it can't be built.
 * Switch flows retrieve the live subscription to get its single price item id.
 */
async function resolvePortalFlowData(
  stripe: Stripe,
  flowRequest: StripePortalFlowRequest,
  row: PortalUserRow
): Promise<Stripe.BillingPortal.SessionCreateParams.FlowData | Response> {
  const currentPlan = userRowIndividualPlan(row);
  if (!currentPlan || !row.stripeSubscriptionId) {
    return Response.json({ error: "No active individual subscription to manage." }, { status: 400 });
  }

  if (flowRequest.kind === "cancel") {
    const flowData = buildStripePortalFlowData(flowRequest, { id: row.stripeSubscriptionId, itemId: null }, null);
    return flowData ?? Response.json({ error: "Unable to start the cancel flow." }, { status: 500 });
  }

  if (flowRequest.plan === currentPlan) {
    return Response.json({ error: `You are already on the ${flowRequest.plan} plan.` }, { status: 400 });
  }
  const targetPriceId = stripePriceIdForIndividualPlan(flowRequest.plan);
  if (!targetPriceId) {
    const envVar = flowRequest.plan === "studio" ? "STRIPE_PRICE_STUDIO" : "STRIPE_PRICE_PRO";
    return Response.json({ error: `${envVar} is not set, so this plan change is unavailable.` }, { status: 501 });
  }

  const subscription = await stripe.subscriptions.retrieve(row.stripeSubscriptionId);
  const itemId = subscription.items?.data[0]?.id ?? null;
  const flowData = buildStripePortalFlowData(flowRequest, { id: subscription.id, itemId }, targetPriceId);
  return flowData ?? Response.json({ error: "Unable to start the plan change flow." }, { status: 500 });
}

/**
 * Redirect to Stripe Customer Portal (manage/cancel subscription). Requires a Stripe customer id on
 * the user. Optional deep links: `?flow=cancel` opens the cancel flow for the active individual
 * subscription, `?flow=switch&plan=pro|studio` opens the confirm screen for that plan change.
 */
export async function GET(request: Request) {
  const gate = await requireStripeBillingSession(request);
  if (!gate.ok) {
    return gate.response;
  }
  const { stripe, userId } = gate;

  const flowRequest = parseStripePortalFlowParams(new URL(request.url).searchParams);
  if (flowRequest === "invalid") {
    return Response.json(
      { error: "Unsupported portal flow. Use flow=cancel or flow=switch with plan=pro|studio." },
      { status: 400 }
    );
  }

  const [u] = await db
    .select({
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!u?.stripeCustomerId) {
    return Response.json({ error: "No billing account yet. Use Checkout first." }, { status: 400 });
  }

  let flowData: Stripe.BillingPortal.SessionCreateParams.FlowData | undefined;
  if (flowRequest) {
    const resolved = await resolvePortalFlowData(stripe, flowRequest, u);
    if (resolved instanceof Response) {
      return resolved;
    }
    flowData = resolved;
  }

  const base = resolveTowerPublicBaseUrl();
  const params: Stripe.BillingPortal.SessionCreateParams = {
    customer: u.stripeCustomerId,
    return_url: `${base}/billing`,
  };

  let portal: Stripe.BillingPortal.Session;
  if (flowData) {
    try {
      portal = await stripe.billingPortal.sessions.create({ ...params, flow_data: flowData });
    } catch (e) {
      // A rejected deep link (e.g. portal configuration disallows the flow) should not dead-end
      // the billing page: land on the plain portal, where the same action is still reachable.
      console.error(`[tower/billing] portal flow "${flowData.type}" rejected; opening plain portal`, e);
      portal = await stripe.billingPortal.sessions.create(params);
    }
  } else {
    portal = await stripe.billingPortal.sessions.create(params);
  }

  if (!portal.url) {
    return Response.json({ error: "No portal URL from Stripe" }, { status: 500 });
  }
  return Response.redirect(portal.url, 303);
}
