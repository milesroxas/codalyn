import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { subscriptionPlanForStatus } from "@/server/billing/stripe-subscription-status";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

function customerIdFrom(c: Stripe.Customer | Stripe.DeletedCustomer | string): string {
  if (typeof c === "string") {
    return c;
  }
  if ("deleted" in c && c.deleted) {
    return c.id;
  }
  return c.id;
}

/**
 * Idempotent: keeps `stripeCustomerId` in sync, maps subscription → `subscription_plan` / `subscription_status`.
 */
export async function applyStripeSubscriptionToUser(sub: Stripe.Subscription, towerUserId: string) {
  const plan = subscriptionPlanForStatus(sub.status);
  const customer = customerIdFrom(sub.customer);
  await db
    .update(user)
    .set({
      stripeCustomerId: customer,
      stripeSubscriptionId: plan === "pro" ? sub.id : null,
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
