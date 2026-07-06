import type Stripe from "stripe";

/**
 * When the individual subscription is scheduled to end (portal cancel sets `cancel_at`), or null
 * when no cancellation is scheduled. Read live from Stripe because the webhook sync only persists
 * status, and a cancel-at-period-end subscription stays `active` until the period ends.
 *
 * Returns null on a failed fetch as well — the billing page then omits the pending-cancel notice
 * rather than failing to render; the portal remains the authoritative view.
 */
export async function fetchIndividualPlanCancelAt(stripe: Stripe, subscriptionId: string): Promise<Date | null> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    return typeof sub.cancel_at === "number" ? new Date(sub.cancel_at * 1000) : null;
  } catch (e) {
    console.error("[tower/billing] failed to read subscription cancellation state", e);
    return null;
  }
}
