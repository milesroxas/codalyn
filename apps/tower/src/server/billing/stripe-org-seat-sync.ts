import { eq } from "drizzle-orm";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { resolveOrganizationSeatQuantity } from "@/server/billing/organization-seat-count";
import { getStripe } from "@/server/billing/stripe-client";
import { readSubscriptionSeatQuantity } from "@/server/billing/stripe-org-app";
import { getStripePriceTeamSeat } from "@/server/billing/team-billing-config";
import { db } from "@/shared/lib/db";
import { organization } from "@/shared/lib/db/auth-schema";

/**
 * Keeps Stripe subscription quantity and `organization.seat_limit` aligned with members + pending invites.
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
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!org?.stripeSubscriptionId) {
    return;
  }

  const desiredQuantity = await resolveOrganizationSeatQuantity(organizationId);
  const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
  const currentQuantity = readSubscriptionSeatQuantity(sub);
  if (currentQuantity === desiredQuantity) {
    await db.update(organization).set({ seatLimit: desiredQuantity }).where(eq(organization.id, organizationId));
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

  await db.update(organization).set({ seatLimit: desiredQuantity }).where(eq(organization.id, organizationId));
}
