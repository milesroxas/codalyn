import { and, eq } from "drizzle-orm";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { isOrganizationProEntitled, organizationBillingPlanLabel } from "@/server/billing/organization-billing";
import { buildOrganizationSeatSnapshot, countOrganizationSeatsUsed } from "@/server/billing/organization-seat-count";
import { isTeamBillingCheckoutConfigured } from "@/server/billing/team-billing-config";
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
  const seatSnapshot = buildOrganizationSeatSnapshot(seatsUsed, org);

  return {
    billingEnabled: isTowerBillingEnabled(),
    teamCheckoutConfigured: isTeamBillingCheckoutConfigured(),
    canManageBilling: isTowerTeamAdminRole(memberRow.role),
    isPaid: isOrganizationProEntitled(billingRow),
    billingPlan: organizationBillingPlanLabel(billingRow),
    subscriptionStatus: org.subscriptionStatus,
    seatLimit: org.seatLimit,
    seatsUsed,
    effectiveSeatLimit: seatSnapshot.effectiveSeatLimit,
    isAtSeatCap: seatSnapshot.isAtSeatCap,
    isOverSeatCap: seatSnapshot.isOverSeatCap,
    seatsRemaining: seatSnapshot.seatsRemaining,
    hasStripeCustomer: Boolean(org.stripeCustomerId),
  };
}
