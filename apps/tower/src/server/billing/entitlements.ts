import { eq, inArray } from "drizzle-orm";
import { isOrganizationProEntitled } from "@/server/billing/organization-billing";
import { userHasIndividualStripePro } from "@/server/billing/stripe-individual-pro";
import { db } from "@/shared/lib/db";
import { member, organization, user } from "@/shared/lib/db/auth-schema";

export type TowerTier = "free" | "pro";

export type TowerEntitlement = {
  tier: TowerTier;
  source: "user_stripe" | "organization" | "none";
};

/**
 * Pro if the signed-in user has an active Pro Stripe subscription, or belongs to a paid workspace
 * (operator-set org billing / Stripe on `organization` — same signals as the operator console).
 */
export async function resolveTowerEntitlement(
  userId: string,
  activeOrganizationId: string | null
): Promise<TowerEntitlement> {
  const [u] = await db
    .select({
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      stripeSubscriptionId: user.stripeSubscriptionId,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (u && (await userHasIndividualStripePro(u))) {
    return { tier: "pro", source: "user_stripe" };
  }

  if (activeOrganizationId) {
    const [o] = await db
      .select({
        id: organization.id,
        subscriptionStatus: organization.subscriptionStatus,
        billingPlan: organization.billingPlan,
        stripeSubscriptionId: organization.stripeSubscriptionId,
      })
      .from(organization)
      .where(eq(organization.id, activeOrganizationId))
      .limit(1);
    if (o && isOrganizationProEntitled(o)) {
      return { tier: "pro", source: "organization" };
    }
  }

  const memberRows = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId));

  const orgIds = memberRows.map((m) => m.organizationId);
  if (orgIds.length === 0) {
    return { tier: "free", source: "none" };
  }

  const orgs = await db
    .select({
      id: organization.id,
      subscriptionStatus: organization.subscriptionStatus,
      billingPlan: organization.billingPlan,
      stripeSubscriptionId: organization.stripeSubscriptionId,
    })
    .from(organization)
    .where(inArray(organization.id, orgIds));

  for (const o of orgs) {
    if (isOrganizationProEntitled(o)) {
      return { tier: "pro", source: "organization" };
    }
  }

  return { tier: "free", source: "none" };
}
