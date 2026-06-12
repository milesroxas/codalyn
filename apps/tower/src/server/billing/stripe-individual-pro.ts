import { eq } from "drizzle-orm";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { type IndividualPaidPlan, userRowIndividualPlan } from "@/server/billing/stripe-subscription-status";
import { db } from "@/shared/lib/db";
import { organization } from "@/shared/lib/db/auth-schema";

export type UserStripeProRow = {
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
};

/**
 * The individual paid plan (Pro or Studio) reflected by a user row, or null. Excludes a workspace
 * Team sub mistakenly persisted on `user` (same `stripe_subscription_id` exists on `organization`).
 */
export async function resolveUserIndividualPlan(row: UserStripeProRow): Promise<IndividualPaidPlan | null> {
  if (!isTowerBillingEnabled()) {
    return null;
  }
  const plan = userRowIndividualPlan(row);
  if (!plan) {
    return null;
  }
  const subId = row.stripeSubscriptionId;
  if (!subId) {
    return null;
  }
  const [orgWithSameSub] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.stripeSubscriptionId, subId))
    .limit(1);
  return orgWithSameSub ? null : plan;
}
