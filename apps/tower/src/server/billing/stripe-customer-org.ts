import { and, eq, isNull } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/shared/lib/db";
import { organization } from "@/shared/lib/db/auth-schema";

/**
 * Returns the workspace Stripe customer id, creating one idempotently when missing.
 */
export async function ensureStripeCustomerForOrganization(
  stripe: Stripe,
  org: { id: string; name: string; stripeCustomerId: string | null },
  adminEmail: string
): Promise<string> {
  if (org.stripeCustomerId) {
    return org.stripeCustomerId;
  }

  const customer = await stripe.customers.create(
    {
      email: adminEmail,
      name: org.name,
      metadata: { towerOrgId: org.id },
    },
    { idempotencyKey: `tower-org-customer-${org.id}` }
  );

  await db
    .update(organization)
    .set({ stripeCustomerId: customer.id })
    .where(and(eq(organization.id, org.id), isNull(organization.stripeCustomerId)));

  const [row] = await db
    .select({ stripeCustomerId: organization.stripeCustomerId })
    .from(organization)
    .where(eq(organization.id, org.id))
    .limit(1);

  return row?.stripeCustomerId ?? customer.id;
}
