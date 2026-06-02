import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { individualPlanForSubscription } from "@/server/billing/stripe-individual-plan";
import { isIndividualUserStripeSubscriptionMetadata } from "@/server/billing/stripe-metadata";
import { stripeCustomerIdFrom } from "@/server/billing/stripe-utils";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

/**
 * Idempotent: keeps `stripeCustomerId` in sync, maps subscription → `subscription_plan` / `subscription_status`.
 * Plan (Pro vs Studio) is derived from the subscription's price ids, not just status.
 */
export async function applyStripeSubscriptionToUser(sub: Stripe.Subscription, towerUserId: string) {
  if (!isIndividualUserStripeSubscriptionMetadata(sub.metadata)) {
    return;
  }
  const plan = individualPlanForSubscription(sub);
  const customer = stripeCustomerIdFrom(sub.customer);
  await db
    .update(user)
    .set({
      stripeCustomerId: customer,
      stripeSubscriptionId: plan === "free" ? null : sub.id,
      subscriptionStatus: sub.status,
      subscriptionPlan: plan,
    })
    .where(eq(user.id, towerUserId));
}

export async function clearStripeUserSubscription(towerUserId: string) {
  await db
    .update(user)
    .set({
      subscriptionPlan: "free",
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null,
    })
    .where(eq(user.id, towerUserId));
}
