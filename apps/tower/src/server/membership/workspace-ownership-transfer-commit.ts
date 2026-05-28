import { and, eq } from "drizzle-orm";
import { isOrganizationProEntitled } from "@/server/billing/organization-billing";
import { getStripe } from "@/server/billing/stripe-client";
import { ensureStripeCustomerForOrganization } from "@/server/billing/stripe-customer-org";
import type { WorkspaceOwnerRow } from "@/server/membership/workspace-ownership";
import { db } from "@/shared/lib/db";
import { member, organization, user, workspaceOwnershipTransfer } from "@/shared/lib/db/auth-schema";

type TransferRow = typeof workspaceOwnershipTransfer.$inferSelect;

type OrganizationBillingRow = {
  subscriptionStatus: string | null;
  billingPlan: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  name: string;
};

export async function commitAcceptedOwnershipTransfer(input: {
  transfer: TransferRow;
  orgRow: WorkspaceOwnerRow;
  billingRow: OrganizationBillingRow | undefined;
  hasTeamSubscription: boolean;
}): Promise<void> {
  const { transfer, orgRow, hasTeamSubscription } = input;

  await db.transaction(async (tx) => {
    const [currentTransfer] = await tx
      .select()
      .from(workspaceOwnershipTransfer)
      .where(eq(workspaceOwnershipTransfer.id, transfer.id))
      .limit(1);
    if (!currentTransfer || currentTransfer.status !== "pending") {
      throw new Error("not_pending");
    }

    await tx
      .update(member)
      .set({ role: "admin" })
      .where(and(eq(member.organizationId, transfer.organizationId), eq(member.userId, transfer.toUserId)));

    await tx
      .update(organization)
      .set({
        ownerUserId: transfer.toUserId,
        billingOwnerUserId: hasTeamSubscription ? transfer.toUserId : orgRow.billingOwnerUserId,
      })
      .where(and(eq(organization.id, transfer.organizationId), eq(organization.ownerUserId, transfer.fromUserId)));

    await tx
      .update(workspaceOwnershipTransfer)
      .set({ status: "accepted" })
      .where(eq(workspaceOwnershipTransfer.id, transfer.id));
  });
}

export async function syncBillingOwnerStripeCustomer(
  transfer: TransferRow,
  billingRow: OrganizationBillingRow | undefined,
  hasTeamSubscription: boolean
): Promise<void> {
  if (!hasTeamSubscription || !billingRow?.stripeCustomerId) {
    return;
  }

  const stripe = getStripe();
  const [recipient] = await db.select({ email: user.email }).from(user).where(eq(user.id, transfer.toUserId)).limit(1);
  if (!stripe || !recipient?.email) {
    return;
  }

  await ensureStripeCustomerForOrganization(
    stripe,
    {
      id: transfer.organizationId,
      name: billingRow.name,
      stripeCustomerId: billingRow.stripeCustomerId,
    },
    recipient.email
  );
}

export function readOrganizationBillingEntitlement(billingRow: OrganizationBillingRow | undefined): boolean {
  if (!billingRow) {
    return false;
  }
  return isOrganizationProEntitled({
    subscriptionStatus: billingRow.subscriptionStatus,
    billingPlan: billingRow.billingPlan,
    stripeSubscriptionId: billingRow.stripeSubscriptionId,
  });
}

export type { OrganizationBillingRow, TransferRow };
