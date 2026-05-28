import type Stripe from "stripe";

export const STRIPE_BILLING_SCOPE_USER = "user" as const;
export const STRIPE_BILLING_SCOPE_ORGANIZATION = "organization" as const;

export type StripeBillingScope = typeof STRIPE_BILLING_SCOPE_USER | typeof STRIPE_BILLING_SCOPE_ORGANIZATION;

export function readTowerUserIdFromStripeMetadata(metadata: Stripe.Metadata | null | undefined): string | null {
  const raw = metadata?.towerUserId;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export function readTowerOrgIdFromStripeMetadata(metadata: Stripe.Metadata | null | undefined): string | null {
  const raw = metadata?.towerOrgId;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export function readTowerOwnershipTransferIdFromStripeMetadata(
  metadata: Stripe.Metadata | null | undefined
): string | null {
  const raw = metadata?.towerOwnershipTransferId;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export function readStripeBillingScopeFromMetadata(
  metadata: Stripe.Metadata | null | undefined
): StripeBillingScope | null {
  const raw = metadata?.towerBillingScope;
  if (raw === STRIPE_BILLING_SCOPE_USER || raw === STRIPE_BILLING_SCOPE_ORGANIZATION) {
    return raw;
  }
  return null;
}

/** True when a Stripe subscription should update the individual `user` row (not workspace team billing). */
export function isIndividualUserStripeSubscriptionMetadata(metadata: Stripe.Metadata | null | undefined): boolean {
  if (readStripeBillingScopeFromMetadata(metadata) === STRIPE_BILLING_SCOPE_ORGANIZATION) {
    return false;
  }
  if (readTowerOrgIdFromStripeMetadata(metadata)) {
    return false;
  }
  return true;
}

export function stripeSubscriptionIdFrom(subscription: string | Stripe.Subscription | null | undefined): string | null {
  if (!subscription) {
    return null;
  }
  return typeof subscription === "string" ? subscription : subscription.id;
}
