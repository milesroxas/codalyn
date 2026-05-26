import type Stripe from "stripe";
import { TEAM_BILLING_PLAN } from "@/server/billing/team-billing-config";

/** Stripe subscription statuses that grant individual Pro entitlements (grace for `past_due`). */
export const STRIPE_PRO_ENTITLED_STATUSES: ReadonlySet<Stripe.Subscription.Status> = new Set([
  "active",
  "trialing",
  "past_due",
]);

export function isStripeSubscriptionProEntitled(status: Stripe.Subscription.Status): boolean {
  return STRIPE_PRO_ENTITLED_STATUSES.has(status);
}

export function subscriptionPlanForStatus(stripeStatus: Stripe.Subscription.Status): "pro" | "free" {
  return isStripeSubscriptionProEntitled(stripeStatus) ? "pro" : "free";
}

/** True when persisted user row reflects an active individual Stripe Pro subscription. */
export function userRowHasStripePro(u: {
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
}): boolean {
  return (
    u.subscriptionPlan === "pro" &&
    Boolean(u.stripeSubscriptionId) &&
    typeof u.subscriptionStatus === "string" &&
    STRIPE_PRO_ENTITLED_STATUSES.has(u.subscriptionStatus as Stripe.Subscription.Status)
  );
}

/** True when persisted organization row reflects an active self-serve Stripe team subscription. */
export function orgRowHasStripeTeam(o: {
  billingPlan: string | null;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
}): boolean {
  return (
    o.billingPlan === TEAM_BILLING_PLAN &&
    Boolean(o.stripeSubscriptionId) &&
    typeof o.subscriptionStatus === "string" &&
    STRIPE_PRO_ENTITLED_STATUSES.has(o.subscriptionStatus as Stripe.Subscription.Status)
  );
}
