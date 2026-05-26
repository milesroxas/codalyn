import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { isStripeSubscriptionProEntitled } from "@/server/billing/stripe-subscription-status";
import { getStripePriceTeamSeat, TEAM_BILLING_PLAN } from "@/server/billing/team-billing-config";
import { db } from "@/shared/lib/db";
import { organization, user } from "@/shared/lib/db/auth-schema";

function customerIdFrom(c: Stripe.Customer | Stripe.DeletedCustomer | string): string {
  if (typeof c === "string") {
    return c;
  }
  if ("deleted" in c && c.deleted) {
    return c.id;
  }
  return c.id;
}

export function readSubscriptionSeatQuantity(sub: Stripe.Subscription): number | null {
  const teamPriceId = getStripePriceTeamSeat();
  const items = sub.items?.data ?? [];
  if (items.length === 0) {
    return null;
  }
  if (teamPriceId) {
    const match = items.find((item) => item.price.id === teamPriceId);
    if (match?.quantity != null) {
      return Math.max(1, match.quantity);
    }
  }
  const firstQty = items[0]?.quantity;
  return firstQty != null ? Math.max(1, firstQty) : null;
}

/**
 * Idempotent: keeps org Stripe fields in sync; maps subscription quantity → `seat_limit`.
 */
export async function applyStripeSubscriptionToOrganization(sub: Stripe.Subscription, towerOrgId: string) {
  const entitled = isStripeSubscriptionProEntitled(sub.status);
  const customer = customerIdFrom(sub.customer);
  const seatLimit = entitled ? readSubscriptionSeatQuantity(sub) : null;

  await db
    .update(organization)
    .set({
      stripeCustomerId: customer,
      stripeSubscriptionId: entitled ? sub.id : null,
      subscriptionStatus: sub.status,
      billingPlan: entitled ? TEAM_BILLING_PLAN : null,
      seatLimit: entitled ? seatLimit : null,
    })
    .where(eq(organization.id, towerOrgId));
}

export async function clearStripeOrganizationSubscription(towerOrgId: string) {
  await db
    .update(organization)
    .set({
      billingPlan: null,
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null,
      seatLimit: null,
    })
    .where(eq(organization.id, towerOrgId));
}

/** Purchaser may create additional workspaces after a successful team subscription. */
export async function grantTeamBillingEligibilityToUser(towerUserId: string) {
  await db.update(user).set({ canCreateOrganization: true }).where(eq(user.id, towerUserId));
}
