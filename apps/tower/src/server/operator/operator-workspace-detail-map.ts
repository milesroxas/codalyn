import { mapOperatorOrgBillingFields } from "@/server/operator/operator-billing";
import type {
  OperatorUsageLimitsView,
  OperatorUsageTrendPoint,
  OperatorWorkspaceDetail,
} from "@/server/operator/types";
import { buildWorkspaceSeatUsage } from "@/shared/lib/billing/workspace-seat-usage";

type WorkspaceDetailOrgRow = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  metadata: string | null;
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

type WorkspaceDetailMemberRow = {
  memberId: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
  beaconRestrictToEditorExperience: boolean | null;
  createdAt: Date | string;
};

type WorkspaceDetailInvitationRow = {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date | string;
  createdAt: Date | string;
  inviterEmail: string | null;
};

export function buildOperatorWorkspaceDetail(input: {
  row: WorkspaceDetailOrgRow;
  seatsUsed: number;
  usage: OperatorUsageLimitsView;
  usageTrend: OperatorUsageTrendPoint[];
  memberRows: WorkspaceDetailMemberRow[];
  invitationRows: WorkspaceDetailInvitationRow[];
  toIso: (d: Date | string | null | undefined) => string;
}): OperatorWorkspaceDetail {
  const { row, seatsUsed, usage, usageTrend, memberRows, invitationRows, toIso } = input;
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
    metadata: row.metadata ?? null,
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
    usageTrend,
    createdAt: toIso(row.createdAt),
    deletedAt: row.deletedAt ? toIso(row.deletedAt) : null,
    purgeScheduledAt: row.purgeScheduledAt ? toIso(row.purgeScheduledAt) : null,
    members: memberRows.map((m) => ({
      memberId: m.memberId,
      userId: m.userId,
      email: m.email,
      name: m.name ?? "",
      role: m.role,
      beaconRestrictToEditorExperience: Boolean(m.beaconRestrictToEditorExperience),
      createdAt: toIso(m.createdAt),
    })),
    invitations: invitationRows.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role ?? null,
      status: i.status,
      expiresAt: toIso(i.expiresAt),
      createdAt: toIso(i.createdAt),
      inviterEmail: i.inviterEmail ?? null,
    })),
  };
}
