import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { resolveOrganizationSeatLimitAfterStripeQuantity } from "@/server/billing/organization-seat-override";
import { isStripeSubscriptionProEntitled } from "@/server/billing/stripe-subscription-status";
import { stripeCustomerIdFrom } from "@/server/billing/stripe-utils";
import { getStripePriceTeamSeat, TEAM_BILLING_PLAN } from "@/server/billing/team-billing-config";
import { db } from "@/shared/lib/db";
import { organization } from "@/shared/lib/db/auth-schema";

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
export async function applyStripeSubscriptionToOrganization(
  sub: Stripe.Subscription,
  towerOrgId: string,
  billingOwnerUserId?: string | null
) {
  const entitled = isStripeSubscriptionProEntitled(sub.status);
  const customer = stripeCustomerIdFrom(sub.customer);
  const stripeSeatQuantity = entitled ? readSubscriptionSeatQuantity(sub) : null;

  const [existing] = await db
    .select({
      seatLimit: organization.seatLimit,
      operatorSeatLimitOverride: organization.operatorSeatLimitOverride,
      stripeSeatQuantity: organization.stripeSeatQuantity,
    })
    .from(organization)
    .where(eq(organization.id, towerOrgId))
    .limit(1);

  const seatLimit = resolveOrganizationSeatLimitAfterStripeQuantity(
    {
      seatLimit: existing?.seatLimit ?? null,
      operatorSeatLimitOverride: existing?.operatorSeatLimitOverride ?? false,
      stripeSeatQuantity: existing?.stripeSeatQuantity ?? null,
    },
    stripeSeatQuantity,
    entitled
  );

  await db
    .update(organization)
    .set({
      stripeCustomerId: customer,
      stripeSubscriptionId: entitled ? sub.id : null,
      subscriptionStatus: sub.status,
      billingPlan: entitled ? TEAM_BILLING_PLAN : null,
      stripeSeatQuantity: entitled ? stripeSeatQuantity : null,
      seatLimit,
      operatorSeatLimitOverride: entitled ? (existing?.operatorSeatLimitOverride ?? false) : false,
      ...(entitled && billingOwnerUserId ? { billingOwnerUserId } : {}),
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
      stripeSeatQuantity: null,
      seatLimit: null,
      operatorSeatLimitOverride: false,
      billingOwnerUserId: null,
    })
    .where(eq(organization.id, towerOrgId));
}
