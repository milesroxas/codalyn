import type Stripe from "stripe";

/**
 * Scheduled end of a subscription (portal cancel sets `cancel_at`), or null when no cancellation is
 * scheduled or the boundary value is malformed. A cancel-at-period-end subscription stays `active`
 * until the period ends, so status alone never reveals a pending cancellation.
 */
export function readSubscriptionCancelAt(sub: Pick<Stripe.Subscription, "cancel_at">): Date | null {
  return typeof sub.cancel_at === "number" && Number.isFinite(sub.cancel_at) ? new Date(sub.cancel_at * 1000) : null;
}

/**
 * Fetches the pending-cancellation date for a subscription. Read live from Stripe because the
 * webhook sync only persists status, and a cancel-at-period-end subscription stays `active` until
 * the period ends.
 *
 * Returns null on a failed fetch as well — billing views then omit the pending-cancel notice
 * rather than failing to render; the portal remains the authoritative view.
 */
export async function fetchSubscriptionCancelAt(stripe: Stripe, subscriptionId: string): Promise<Date | null> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    return readSubscriptionCancelAt(sub);
  } catch (e) {
    console.error("[tower/billing] failed to read subscription cancellation state", e);
    return null;
  }
}
