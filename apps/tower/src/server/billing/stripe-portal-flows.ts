import type Stripe from "stripe";
import type { IndividualPaidPlan } from "@/server/billing/stripe-subscription-status";

/**
 * Deep-link flows for the Stripe customer portal, requested by the /billing plan ladder via
 * query params on GET /api/billing/portal: `?flow=cancel` and `?flow=switch&plan=pro|studio`.
 *
 * Plan changes and cancellation intentionally run through portal flows instead of bespoke
 * endpoints: Stripe renders the proration preview and confirmation step, so Tower never mutates
 * a subscription directly and the webhook remains the single write path for plan state.
 */
export type StripePortalFlowRequest = { kind: "cancel" } | { kind: "switch"; plan: IndividualPaidPlan };

/**
 * Parses portal flow query params. Returns null when no flow is requested (plain portal) and
 * "invalid" for unrecognized flows or a switch without a valid target plan, so the route can
 * reject explicitly instead of silently opening the wrong portal page.
 */
export function parseStripePortalFlowParams(params: URLSearchParams): StripePortalFlowRequest | null | "invalid" {
  const flow = params.get("flow");
  if (flow === null) {
    return null;
  }
  if (flow === "cancel") {
    return { kind: "cancel" };
  }
  if (flow === "switch") {
    const plan = params.get("plan");
    if (plan === "pro" || plan === "studio") {
      return { kind: "switch", plan };
    }
    return "invalid";
  }
  return "invalid";
}

/**
 * Builds `flow_data` for a portal session deep link.
 *
 * `subscriptionItemId` is only required for switches: the update-confirm flow replaces the
 * subscription's single price item with the target price, and Stripe shows the confirm screen.
 */
export function buildStripePortalFlowData(
  request: StripePortalFlowRequest,
  subscription: { id: string; itemId: string | null },
  targetPriceId: string | null
): Stripe.BillingPortal.SessionCreateParams.FlowData | null {
  if (request.kind === "cancel") {
    return {
      type: "subscription_cancel",
      subscription_cancel: { subscription: subscription.id },
    };
  }
  if (!subscription.itemId || !targetPriceId) {
    return null;
  }
  return {
    type: "subscription_update_confirm",
    subscription_update_confirm: {
      subscription: subscription.id,
      items: [{ id: subscription.itemId, price: targetPriceId, quantity: 1 }],
    },
  };
}
