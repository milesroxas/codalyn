import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { applyStripeSubscriptionToUser, clearStripeUserSubscription } from "@/server/billing/stripe-app";
import {
  isIndividualUserStripeSubscriptionMetadata,
  readStripeBillingScopeFromMetadata,
  readTowerOrgIdFromStripeMetadata,
  readTowerOwnershipTransferIdFromStripeMetadata,
  readTowerUserIdFromStripeMetadata,
  STRIPE_BILLING_SCOPE_ORGANIZATION,
  STRIPE_BILLING_SCOPE_USER,
  stripeSubscriptionIdFrom,
} from "@/server/billing/stripe-metadata";
import {
  applyStripeSubscriptionToOrganization,
  clearStripeOrganizationSubscription,
} from "@/server/billing/stripe-org-app";
import { subscriptionPlanForStatus } from "@/server/billing/stripe-subscription-status";
import { workspaceOwnershipTransferService } from "@/server/membership/workspace-ownership-transfer";
import { db } from "@/shared/lib/db";
import { organization, stripeWebhookEvent, user } from "@/shared/lib/db/auth-schema";

async function resolveTowerUserIdBySubscription(sub: Stripe.Subscription): Promise<string | undefined> {
  if (!isIndividualUserStripeSubscriptionMetadata(sub.metadata)) {
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

export async function applyStripeCheckoutSessionCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<void> {
  const ownershipTransferId = readTowerOwnershipTransferIdFromStripeMetadata(session.metadata);
  if (ownershipTransferId) {
    await workspaceOwnershipTransferService.markBillingReadyForTransfer(ownershipTransferId);
    return;
  }

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
    const purchaserId = readTowerUserIdFromStripeMetadata(session.metadata);
    await applyStripeSubscriptionToOrganization(sub, towerOrgId, purchaserId);
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

async function onSubscriptionChanged(stripe: Stripe, event: Stripe.Subscription): Promise<void> {
  // Stripe does not guarantee event ordering: a stale `customer.subscription.updated` can be delivered
  // after a `deleted` and resurrect a canceled subscription (or revert seat quantity). Re-retrieve the
  // authoritative current state by id before applying so writes never depend on a stale event payload.
  const s = await stripe.subscriptions.retrieve(event.id);
  const orgId = await resolveTowerOrgIdBySubscription(s);
  if (orgId) {
    if (subscriptionPlanForStatus(s.status) === "free") {
      await clearStripeOrganizationSubscription(orgId);
      return;
    }
    const purchaserId = readTowerUserIdFromStripeMetadata(s.metadata);
    await applyStripeSubscriptionToOrganization(s, orgId, purchaserId);
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

async function dispatchStripeWebhookEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await applyStripeCheckoutSessionCompleted(stripe, event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await onSubscriptionChanged(stripe, event.data.object);
      break;
    case "customer.subscription.deleted":
      await onSubscriptionChanged(stripe, event.data.object);
      break;
    default:
      break;
  }
}

/**
 * Idempotent: maps Stripe webhooks to `user` or `organization` subscription fields.
 *
 * Deliveries are deduplicated via a processed-event ledger so Stripe's at-least-once retries never
 * re-run handlers: the event id is claimed before processing (concurrent duplicates lose the insert and
 * short-circuit). If a handler throws, the claim is released so the next Stripe retry re-processes it.
 */
export async function applyStripeWebhookEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  const claimed = await db
    .insert(stripeWebhookEvent)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: stripeWebhookEvent.id });
  if (claimed.length === 0) {
    return;
  }

  try {
    await dispatchStripeWebhookEvent(stripe, event);
  } catch (e) {
    await db.delete(stripeWebhookEvent).where(eq(stripeWebhookEvent.id, event.id));
    throw e;
  }
}
