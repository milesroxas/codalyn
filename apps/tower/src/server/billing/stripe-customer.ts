import { and, eq, isNull } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

/**
 * Returns the Tower user's Stripe customer id, creating one idempotently when missing.
 */
export async function ensureStripeCustomerForUser(
  stripe: Stripe,
  towerUser: { id: string; email: string; stripeCustomerId: string | null }
): Promise<string> {
  if (towerUser.stripeCustomerId) {
    return towerUser.stripeCustomerId;
  }

  const customer = await stripe.customers.create(
    {
      email: towerUser.email,
      metadata: { towerUserId: towerUser.id },
    },
    { idempotencyKey: `tower-customer-${towerUser.id}` }
  );

  await db
    .update(user)
    .set({ stripeCustomerId: customer.id })
    .where(and(eq(user.id, towerUser.id), isNull(user.stripeCustomerId)));

  const [row] = await db
    .select({ stripeCustomerId: user.stripeCustomerId })
    .from(user)
    .where(eq(user.id, towerUser.id))
    .limit(1);

  return row?.stripeCustomerId ?? customer.id;
}
