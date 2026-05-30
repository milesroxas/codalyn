import { and, eq } from "drizzle-orm";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { isOrganizationProEntitled, organizationBillingPlanLabel } from "@/server/billing/organization-billing";
import { countOrganizationSeatsUsed } from "@/server/billing/organization-seat-count";
import { shouldBumpStripeTeamQuantityToMinimum } from "@/server/billing/organization-seat-override";
import { syncOrganizationSeatQuantityWithStripe } from "@/server/billing/stripe-org-seat-sync";
import { isTeamBillingCheckoutConfigured } from "@/server/billing/team-billing-config";
import { buildWorkspaceSeatUsage } from "@/shared/lib/billing/workspace-seat-usage";
import { db } from "@/shared/lib/db";
import { member, organization } from "@/shared/lib/db/auth-schema";
import { isTowerTeamAdminRole } from "@/shared/lib/membership/tower-organization-access";

export type WorkspaceBillingView = {
  billingEnabled: boolean;
  teamCheckoutConfigured: boolean;
  canManageBilling: boolean;
  isPaid: boolean;
  billingPlan: string | null;
  subscriptionStatus: string | null;
  seatLimit: number | null;
  seatsUsed: number;
  effectiveSeatLimit: number;
  isAtSeatCap: boolean;
  isOverSeatCap: boolean;
  seatsRemaining: number;
  stripeSeatQuantity: number | null;
  operatorSeatLimitOverride: boolean;
  hasStripeCustomer: boolean;
};

export async function fetchWorkspaceBillingView(
  userId: string,
  organizationId: string
): Promise<WorkspaceBillingView | null> {
  const [[memberRow], [org], seatsUsed] = await Promise.all([
    db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1),
    db
      .select({
        subscriptionStatus: organization.subscriptionStatus,
        billingPlan: organization.billingPlan,
        stripeSubscriptionId: organization.stripeSubscriptionId,
        stripeCustomerId: organization.stripeCustomerId,
        seatLimit: organization.seatLimit,
        stripeSeatQuantity: organization.stripeSeatQuantity,
        operatorSeatLimitOverride: organization.operatorSeatLimitOverride,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1),
    countOrganizationSeatsUsed(organizationId),
  ]);

  if (!memberRow || !org) {
    return null;
  }

  const billingRow = {
    subscriptionStatus: org.subscriptionStatus,
    billingPlan: org.billingPlan,
    stripeSubscriptionId: org.stripeSubscriptionId,
  };

  if (
    isOrganizationProEntitled(billingRow) &&
    org.stripeSubscriptionId &&
    shouldBumpStripeTeamQuantityToMinimum(true, org, org.stripeSeatQuantity ?? null)
  ) {
    await syncOrganizationSeatQuantityWithStripe(organizationId);
    const [refreshed] = await db
      .select({
        seatLimit: organization.seatLimit,
        stripeSeatQuantity: organization.stripeSeatQuantity,
        operatorSeatLimitOverride: organization.operatorSeatLimitOverride,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);
    if (refreshed) {
      org.seatLimit = refreshed.seatLimit;
      org.stripeSeatQuantity = refreshed.stripeSeatQuantity;
      org.operatorSeatLimitOverride = refreshed.operatorSeatLimitOverride;
    }
  }

  const seatUsage = buildWorkspaceSeatUsage(seatsUsed, org);

  return {
    billingEnabled: isTowerBillingEnabled(),
    teamCheckoutConfigured: isTeamBillingCheckoutConfigured(),
    canManageBilling: isTowerTeamAdminRole(memberRow.role),
    isPaid: isOrganizationProEntitled(billingRow),
    billingPlan: organizationBillingPlanLabel(billingRow),
    subscriptionStatus: org.subscriptionStatus,
    seatLimit: seatUsage.seatLimit,
    seatsUsed: seatUsage.seatsUsed,
    effectiveSeatLimit: seatUsage.effectiveSeatLimit,
    isAtSeatCap: seatUsage.isAtSeatCap,
    isOverSeatCap: seatUsage.isOverSeatCap,
    seatsRemaining: seatUsage.seatsRemaining,
    stripeSeatQuantity: seatUsage.stripeSeatQuantity,
    operatorSeatLimitOverride: seatUsage.operatorSeatLimitOverride,
    hasStripeCustomer: Boolean(org.stripeCustomerId),
  };
}
