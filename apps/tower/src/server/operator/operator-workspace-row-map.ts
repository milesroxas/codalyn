import { mapOperatorOrgBillingFields } from "@/server/operator/operator-billing";
import type { OperatorUsageLimitsView, OperatorWorkspaceRow } from "@/server/operator/types";
import { buildWorkspaceSeatUsage } from "@/shared/lib/billing/workspace-seat-usage";

type OperatorWorkspaceListDbRow = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  seatLimit: number | null;
  stripeSeatQuantity: number | null;
  operatorSeatLimitOverride: boolean;
  billingPlan: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date | string;
  deletedAt: Date | string | null;
  purgeScheduledAt: Date | string | null;
  memberCount: number;
  pendingInvitations: number;
};

export function mapOperatorWorkspaceListRow(input: {
  row: OperatorWorkspaceListDbRow;
  seatsUsed: number;
  usage: OperatorUsageLimitsView;
  toIso: (d: Date | string | null | undefined) => string;
}): OperatorWorkspaceRow {
  const { row, seatsUsed, usage, toIso } = input;
  const memberCount = Number(row.memberCount ?? 0);
  const pendingInvitations = Number(row.pendingInvitations ?? 0);
  const seatUsage = buildWorkspaceSeatUsage(seatsUsed, {
    seatLimit: row.seatLimit ?? null,
    stripeSeatQuantity: row.stripeSeatQuantity ?? null,
    operatorSeatLimitOverride: row.operatorSeatLimitOverride ?? false,
  });

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo ?? null,
    seatLimit: seatUsage.seatLimit,
    effectiveSeatLimit: seatUsage.effectiveSeatLimit,
    isAtSeatCap: seatUsage.isAtSeatCap,
    isOverSeatCap: seatUsage.isOverSeatCap,
    ...mapOperatorOrgBillingFields({
      billingPlan: row.billingPlan ?? null,
      subscriptionStatus: row.subscriptionStatus ?? null,
      stripeCustomerId: row.stripeCustomerId ?? null,
      stripeSubscriptionId: row.stripeSubscriptionId ?? null,
      operatorSeatLimitOverride: row.operatorSeatLimitOverride ?? false,
      stripeSeatQuantity: row.stripeSeatQuantity ?? null,
    }),
    memberCount,
    pendingInvitations,
    usage,
    createdAt: toIso(row.createdAt),
    deletedAt: row.deletedAt ? toIso(row.deletedAt) : null,
    purgeScheduledAt: row.purgeScheduledAt ? toIso(row.purgeScheduledAt) : null,
  };
}
