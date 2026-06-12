import { eq } from "drizzle-orm";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { resolveOrganizationSeatQuantity } from "@/server/billing/organization-seat-count";
import { shouldSkipStripeSeatQuantitySync } from "@/server/billing/organization-seat-override";
import { getStripe } from "@/server/billing/stripe-client";
import { readSubscriptionSeatQuantity } from "@/server/billing/stripe-org-app";
import { getStripePriceTeamSeat } from "@/server/billing/team-billing-config";
import { resolveSyncedSeatQuantity } from "@/server/billing/team-seat-quantity";
import { db } from "@/shared/lib/db";
import { organization } from "@/shared/lib/db/auth-schema";

/**
 * Keeps Stripe subscription quantity and `organization.seat_limit` aligned with members + pending invites.
 * Grow-only: the quantity is raised to fit new seats in use but never dropped below the seats already
 * purchased on the subscription, so an admin's selected seat count survives member churn (seat reductions
 * are made deliberately via the Stripe Customer Portal and applied through the webhook).
 * No-op when billing is off or the workspace has no active team subscription.
 */
export async function syncOrganizationSeatQuantityWithStripe(organizationId: string): Promise<void> {
  if (!isTowerBillingEnabled()) {
    return;
  }
  const stripe = getStripe();
  const teamPriceId = getStripePriceTeamSeat();
  if (!stripe || !teamPriceId) {
    return;
  }

  const [org] = await db
    .select({
      id: organization.id,
      stripeSubscriptionId: organization.stripeSubscriptionId,
      billingPlan: organization.billingPlan,
      operatorSeatLimitOverride: organization.operatorSeatLimitOverride,
      stripeSeatQuantity: organization.stripeSeatQuantity,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!org?.stripeSubscriptionId) {
    return;
  }

  if (shouldSkipStripeSeatQuantitySync(org)) {
    return;
  }

  const seatFloor = await resolveOrganizationSeatQuantity(organizationId);
  // Grow-only: when the seat floor already fits within the purchased quantity, nothing grows. Skip the
  // Stripe round-trip + redundant write entirely (member removals and invite cancellations land here).
  if (org.stripeSeatQuantity != null && seatFloor <= org.stripeSeatQuantity) {
    return;
  }

  const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
  const currentQuantity = readSubscriptionSeatQuantity(sub);
  const desiredQuantity = resolveSyncedSeatQuantity(seatFloor, currentQuantity);
  if (currentQuantity === desiredQuantity) {
    await db
      .update(organization)
      .set({ seatLimit: desiredQuantity, stripeSeatQuantity: desiredQuantity })
      .where(eq(organization.id, organizationId));
    return;
  }

  const item = sub.items.data.find((line) => line.price.id === teamPriceId) ?? sub.items.data[0];
  if (!item) {
    return;
  }

  await stripe.subscriptions.update(org.stripeSubscriptionId, {
    items: [{ id: item.id, quantity: desiredQuantity }],
    proration_behavior: "create_prorations",
  });

  await db
    .update(organization)
    .set({ seatLimit: desiredQuantity, stripeSeatQuantity: desiredQuantity })
    .where(eq(organization.id, organizationId));
}
