import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { applyStripeSubscriptionToUser, clearStripeUserSubscription } from "@/server/billing/stripe-app";
import {
  readStripeBillingScopeFromMetadata,
  readTowerOrgIdFromStripeMetadata,
  readTowerUserIdFromStripeMetadata,
  STRIPE_BILLING_SCOPE_ORGANIZATION,
  STRIPE_BILLING_SCOPE_USER,
  stripeSubscriptionIdFrom,
} from "@/server/billing/stripe-metadata";
import {
  applyStripeSubscriptionToOrganization,
  clearStripeOrganizationSubscription,
  grantTeamBillingEligibilityToUser,
} from "@/server/billing/stripe-org-app";
import { subscriptionPlanForStatus } from "@/server/billing/stripe-subscription-status";
import { db } from "@/shared/lib/db";
import { organization, user } from "@/shared/lib/db/auth-schema";

async function resolveTowerUserIdBySubscription(sub: Stripe.Subscription): Promise<string | undefined> {
  const scope = readStripeBillingScopeFromMetadata(sub.metadata);
  if (scope === STRIPE_BILLING_SCOPE_ORGANIZATION) {
    return undefined;
  }
  const fromMeta = readTowerUserIdFromStripeMetadata(sub.metadata);
  if (fromMeta) {
    return fromMeta;
  }
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.stripeSubscriptionId, sub.id)).limit(1);
  return row?.id;
}

async function resolveTowerOrgIdBySubscription(sub: Stripe.Subscription): Promise<string | undefined> {
  const scope = readStripeBillingScopeFromMetadata(sub.metadata);
  if (scope === STRIPE_BILLING_SCOPE_USER) {
    return undefined;
  }
  const fromMeta = readTowerOrgIdFromStripeMetadata(sub.metadata);
  if (fromMeta) {
    return fromMeta;
  }
  const [row] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.stripeSubscriptionId, sub.id))
    .limit(1);
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

  const sessionScope = readStripeBillingScopeFromMetadata(session.metadata);
  const towerOrgId =
    readTowerOrgIdFromStripeMetadata(session.metadata) ??
    (sessionScope === STRIPE_BILLING_SCOPE_ORGANIZATION && typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null);

  const sub = await stripe.subscriptions.retrieve(subId);

  if (towerOrgId) {
    await applyStripeSubscriptionToOrganization(sub, towerOrgId);
    const purchaserId = readTowerUserIdFromStripeMetadata(session.metadata);
    if (purchaserId) {
      await grantTeamBillingEligibilityToUser(purchaserId);
    }
    return;
  }

  const towerUserId =
    (typeof session.client_reference_id === "string" && session.client_reference_id.length > 0
      ? session.client_reference_id
      : null) ?? readTowerUserIdFromStripeMetadata(session.metadata);
  if (!towerUserId) {
    return;
  }
  await applyStripeSubscriptionToUser(sub, towerUserId);
}

async function onSubscriptionChanged(s: Stripe.Subscription): Promise<void> {
  const orgId = await resolveTowerOrgIdBySubscription(s);
  if (orgId) {
    if (subscriptionPlanForStatus(s.status) === "free") {
      await clearStripeOrganizationSubscription(orgId);
      return;
    }
    await applyStripeSubscriptionToOrganization(s, orgId);
    const purchaserId = readTowerUserIdFromStripeMetadata(s.metadata);
    if (purchaserId) {
      await grantTeamBillingEligibilityToUser(purchaserId);
    }
    return;
  }

  const userId = await resolveTowerUserIdBySubscription(s);
  if (!userId) {
    return;
  }
  if (subscriptionPlanForStatus(s.status) === "free") {
    await clearStripeUserSubscription(userId);
    return;
  }
  await applyStripeSubscriptionToUser(s, userId);
}

/**
 * Idempotent: maps Stripe webhooks to `user` or `organization` subscription fields.
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
