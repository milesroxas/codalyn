import type Stripe from "stripe";

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
