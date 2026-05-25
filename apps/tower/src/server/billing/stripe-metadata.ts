import type Stripe from "stripe";

export function readTowerUserIdFromStripeMetadata(metadata: Stripe.Metadata | null | undefined): string | null {
  const raw = metadata?.towerUserId;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export function stripeSubscriptionIdFrom(subscription: string | Stripe.Subscription | null | undefined): string | null {
  if (!subscription) {
    return null;
  }
  return typeof subscription === "string" ? subscription : subscription.id;
}
