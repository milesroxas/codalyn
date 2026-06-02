import { eq } from "drizzle-orm";
import { cache } from "react";
import { isOrganizationTeamEntitled } from "@/server/billing/organization-billing";
import { resolveUserIndividualPlan } from "@/server/billing/stripe-individual-pro";
import { db } from "@/shared/lib/db";
import { organization, user } from "@/shared/lib/db/auth-schema";

export type TowerTier = "free" | "pro" | "studio" | "team";

export type TowerEntitlementSource = "none" | "user_stripe" | "workspace_team";

export type TowerEntitlement = {
  tier: TowerTier;
  source: TowerEntitlementSource;
};

/**
 * Usage limits follow the **active workspace** first, then the user's individual Pro subscription.
 * Membership in other paid workspaces does not apply until that workspace is active.
 *
 * Request-memoized via `cache()` so the layout, page, and inner usage-status reads share one
 * resolution per render (keyed by user + active workspace).
 */
export const resolveTowerEntitlement = cache(async function resolveTowerEntitlement(
  userId: string,
  activeOrganizationId: string | null
): Promise<TowerEntitlement> {
  if (activeOrganizationId) {
    const [o] = await db
      .select({
        subscriptionStatus: organization.subscriptionStatus,
        billingPlan: organization.billingPlan,
        stripeSubscriptionId: organization.stripeSubscriptionId,
      })
      .from(organization)
      .where(eq(organization.id, activeOrganizationId))
      .limit(1);
    if (o && isOrganizationTeamEntitled(o)) {
      return { tier: "team", source: "workspace_team" };
    }
  }

  const [u] = await db
    .select({
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      stripeSubscriptionId: user.stripeSubscriptionId,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const individualPlan = u ? await resolveUserIndividualPlan(u) : null;
  if (individualPlan) {
    return { tier: individualPlan, source: "user_stripe" };
  }

  return { tier: "free", source: "none" };
});
