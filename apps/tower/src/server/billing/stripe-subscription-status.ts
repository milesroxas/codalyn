import type Stripe from "stripe";
import { TEAM_BILLING_PLAN } from "@/server/billing/team-billing-config";

/** Stripe subscription statuses that grant individual Pro entitlements (grace for `past_due`). */
const STRIPE_PRO_ENTITLED_STATUSES: ReadonlySet<Stripe.Subscription.Status> = new Set([
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

/** Individual (user-scoped) paid plans stored on `user.subscription_plan`. Team is workspace-scoped. */
const INDIVIDUAL_PAID_PLANS = ["pro", "studio"] as const;

export type IndividualPaidPlan = (typeof INDIVIDUAL_PAID_PLANS)[number];

function isIndividualPaidPlan(raw: string | null | undefined): raw is IndividualPaidPlan {
  return raw === "pro" || raw === "studio";
}

/** The active individual paid plan reflected by a persisted user row, or null when none applies. */
export function userRowIndividualPlan(u: {
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
}): IndividualPaidPlan | null {
  if (
    isIndividualPaidPlan(u.subscriptionPlan) &&
    u.stripeSubscriptionId &&
    typeof u.subscriptionStatus === "string" &&
    STRIPE_PRO_ENTITLED_STATUSES.has(u.subscriptionStatus as Stripe.Subscription.Status)
  ) {
    return u.subscriptionPlan;
  }
  return null;
}

/** True when persisted user row reflects an active individual paid subscription (Pro or Studio). */
export function userRowHasIndividualPaidPlan(u: {
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
}): boolean {
  return userRowIndividualPlan(u) !== null;
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
