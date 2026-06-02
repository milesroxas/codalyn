import type Stripe from "stripe";
import { getStripePricePro, getStripePriceStudio } from "@/server/billing/stripe-config";
import { type IndividualPaidPlan, isStripeSubscriptionProEntitled } from "@/server/billing/stripe-subscription-status";

/** Resolved individual plan for an entitled subscription, or `free` when not entitled. */
export type ResolvedIndividualPlan = IndividualPaidPlan | "free";

/**
 * Maps a set of Stripe subscription line-item price ids to the individual paid plan.
 * Studio takes precedence when its price is present; otherwise defaults to Pro (covers the
 * single-product Pro flow and legacy individual subscriptions created before Studio existed).
 */
export function individualPlanFromPriceIds(priceIds: ReadonlyArray<string | null | undefined>): IndividualPaidPlan {
  const studioPrice = getStripePriceStudio();
  if (studioPrice && priceIds.some((id) => id === studioPrice)) {
    return "studio";
  }
  return "pro";
}

/** Derives the individual plan a Stripe subscription grants, inspecting status then price ids. */
export function individualPlanForSubscription(sub: Stripe.Subscription): ResolvedIndividualPlan {
  if (!isStripeSubscriptionProEntitled(sub.status)) {
    return "free";
  }
  return individualPlanFromPriceIds((sub.items?.data ?? []).map((item) => item.price?.id));
}

/** The recurring Stripe price id configured for a user-scoped paid plan. */
export function stripePriceIdForIndividualPlan(plan: IndividualPaidPlan): string | null {
  return plan === "studio" ? getStripePriceStudio() : getStripePricePro();
}
