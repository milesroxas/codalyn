import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { applyStripeSubscriptionToUser, clearStripeUserSubscription } from "@/server/billing/stripe-app";
import { readTowerUserIdFromStripeMetadata, stripeSubscriptionIdFrom } from "@/server/billing/stripe-metadata";
import { subscriptionPlanForStatus } from "@/server/billing/stripe-subscription-status";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

async function resolveTowerUserIdBySubscription(sub: Stripe.Subscription): Promise<string | undefined> {
  const fromMeta = readTowerUserIdFromStripeMetadata(sub.metadata);
  if (fromMeta) {
    return fromMeta;
  }
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.stripeSubscriptionId, sub.id)).limit(1);
  return row?.id;
}

async function onCheckoutSessionCompleted(stripe: Stripe, session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "subscription" || !session.subscription) {
    return;
  }
  const subId = stripeSubscriptionIdFrom(session.subscription);
  if (!subId) {
    return;
  }
  const towerUserId =
    (typeof session.client_reference_id === "string" && session.client_reference_id.length > 0
      ? session.client_reference_id
      : null) ?? readTowerUserIdFromStripeMetadata(session.metadata);
  if (!towerUserId) {
    return;
  }
  const sub = await stripe.subscriptions.retrieve(subId);
  await applyStripeSubscriptionToUser(sub, towerUserId);
}

async function onSubscriptionChanged(s: Stripe.Subscription): Promise<void> {
  const id = await resolveTowerUserIdBySubscription(s);
  if (!id) {
    return;
  }
  if (subscriptionPlanForStatus(s.status) === "free") {
    await clearStripeUserSubscription(id);
    return;
  }
  await applyStripeSubscriptionToUser(s, id);
}

/**
 * Idempotent: maps Stripe webhooks to `user` subscription fields. Requires a Product + Price in Stripe
 * and `STRIPE_PRICE_PRO` / checkout metadata wired as in `/api/billing/checkout`.
 */
export async function applyStripeWebhookEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutSessionCompleted(stripe, event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await onSubscriptionChanged(event.data.object);
      break;
    case "customer.subscription.deleted":
      await onSubscriptionChanged(event.data.object);
      break;
    default:
      break;
  }
}
