import type Stripe from "stripe";
import { isStripeSubscriptionProEntitled, orgRowHasStripeTeam } from "@/server/billing/stripe-subscription-status";
import { TEAM_BILLING_PLAN } from "@/server/billing/team-billing-config";

/** Operator-console plan strings that grant Team workspace limits without Stripe (legacy). */
const LEGACY_OPERATOR_TEAM_PLANS = new Set(["pro team", "team", "team pro", "pro+", "pro"]);

export type OrganizationBillingRow = {
  subscriptionStatus: string | null;
  billingPlan: string | null;
  stripeSubscriptionId: string | null;
};

/**
 * Whether a workspace row grants Team usage limits and paid-seat collaboration.
 * Single source of truth — used by entitlements and workspace billing UI.
 */
export function isOrganizationTeamEntitled(row: OrganizationBillingRow): boolean {
  if (
    !row.subscriptionStatus ||
    !isStripeSubscriptionProEntitled(row.subscriptionStatus as Stripe.Subscription.Status)
  ) {
    return false;
  }
  if (orgRowHasStripeTeam(row)) {
    return true;
  }
  if (row.stripeSubscriptionId) {
    return true;
  }
  const plan = row.billingPlan?.trim().toLowerCase() ?? "";
  return LEGACY_OPERATOR_TEAM_PLANS.has(plan);
}
export function organizationBillingPlanLabel(row: OrganizationBillingRow): string | null {
  if (orgRowHasStripeTeam(row)) {
    return TEAM_BILLING_PLAN;
  }
  return row.billingPlan?.trim() || null;
}
