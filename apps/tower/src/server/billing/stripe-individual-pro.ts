import { eq } from "drizzle-orm";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { userRowHasStripePro } from "@/server/billing/stripe-subscription-status";
import { db } from "@/shared/lib/db";
import { organization } from "@/shared/lib/db/auth-schema";

export type UserStripeProRow = {
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
};

/**
 * True when the user row reflects an individual Pro subscription, not a workspace Team sub
 * that was mistakenly persisted on `user` (same `stripe_subscription_id` on `organization`).
 */
export async function userHasIndividualStripePro(row: UserStripeProRow): Promise<boolean> {
  if (!isTowerBillingEnabled() || !userRowHasStripePro(row)) {
    return false;
  }
  const subId = row.stripeSubscriptionId;
  if (!subId) {
    return false;
  }
  const [orgWithSameSub] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.stripeSubscriptionId, subId))
    .limit(1);
  return !orgWithSameSub;
}
