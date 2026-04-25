import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { applyStripeSubscriptionToUser, clearStripeUserSubscription } from "@/server/billing/stripe-app";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

async function resolveTowerUserIdBySubscriptionId(sub: Stripe.Subscription): Promise<string | undefined> {
  const fromMeta = sub.metadata?.towerUserId;
  if (typeof fromMeta === "string" && fromMeta.length > 0) {
    return fromMeta;
  }
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.stripeSubscriptionId, sub.id)).limit(1);
  return row?.id;
}

async function onCheckoutSessionCompleted(stripe: Stripe, session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "subscription" || !session.subscription) {
    return;
  }
  const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const towerUserId = session.client_reference_id ?? session.metadata?.towerUserId;
  if (typeof towerUserId !== "string" || towerUserId.length === 0) {
    return;
  }
  const sub = await stripe.subscriptions.retrieve(subId);
  await applyStripeSubscriptionToUser(sub, towerUserId);
}

async function onSubscriptionUpdated(s: Stripe.Subscription): Promise<void> {
  const id = await resolveTowerUserIdBySubscriptionId(s);
  if (id) {
    await applyStripeSubscriptionToUser(s, id);
  }
}

async function onSubscriptionDeleted(s: Stripe.Subscription): Promise<void> {
  const id = await resolveTowerUserIdBySubscriptionId(s);
  if (id) {
    await clearStripeUserSubscription(id);
  }
}

/**
 * Idempotent: maps Stripe webhooks to `user` subscription fields. Requires a Product + Price in Stripe
 * and `STRIPE_PRICE_PRO` / checkout metadata wired as in `/api/billing/checkout`.
 */
export async function applyStripeWebhookEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  if (event.type === "checkout.session.completed") {
    await onCheckoutSessionCompleted(stripe, event.data.object);
    return;
  }
  if (event.type === "customer.subscription.updated") {
    await onSubscriptionUpdated(event.data.object);
    return;
  }
  if (event.type === "customer.subscription.deleted") {
    await onSubscriptionDeleted(event.data.object);
  }
}
