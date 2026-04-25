import { eq } from "drizzle-orm";
import type Stripe from "stripe";
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

export function subscriptionPlanForStatus(stripeStatus: Stripe.Subscription.Status): "pro" | "free" {
  if (stripeStatus === "active" || stripeStatus === "trialing" || stripeStatus === "past_due") {
    return "pro";
  }
  return "free";
}

export function simplifySubscriptionStatus(stripeStatus: Stripe.Subscription.Status): string {
  return stripeStatus;
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
      stripeSubscriptionId: sub.id,
      subscriptionStatus: simplifySubscriptionStatus(sub.status),
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
