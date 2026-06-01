import { and, count, eq, isNull } from "drizzle-orm";
import { isOrganizationTeamEntitled } from "@/server/billing/organization-billing";
import { assertUserIsWorkspaceOwner } from "@/server/membership/workspace-ownership";
import { db } from "@/shared/lib/db";
import { invitation, member, organization, organizationWebflowOAuthToken } from "@/shared/lib/db/auth-schema";
import { TOWER_INVITATION_STATUS } from "@/shared/lib/membership/tower-invitation-status";
import { WORKSPACE_SOFT_DELETE_RECOVERY_DAYS } from "@/shared/lib/membership/workspace-ownership";

export type WorkspaceDeletionPreview = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  memberCount: number;
  pendingInviteCount: number;
  hasTeamSubscription: boolean;
  hasWebflowConnection: boolean;
  hasTeamPresets: boolean;
  recoveryDays: number;
  isRecoverable: boolean;
};

export async function loadWorkspaceDeletionPreview(
  organizationId: string,
  actorUserId: string
): Promise<WorkspaceDeletionPreview> {
  await assertUserIsWorkspaceOwner(actorUserId, organizationId);

  const [orgRow] = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      subscriptionStatus: organization.subscriptionStatus,
      billingPlan: organization.billingPlan,
      stripeSubscriptionId: organization.stripeSubscriptionId,
      beaconTeamSettings: organization.beaconTeamSettings,
    })
    .from(organization)
    .where(and(eq(organization.id, organizationId), isNull(organization.deletedAt)))
    .limit(1);

  if (!orgRow) {
    throw new Error("workspace_not_found");
  }

  const [[memberCountRow], [pendingInviteCountRow], [webflowRow]] = await Promise.all([
    db.select({ value: count() }).from(member).where(eq(member.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(invitation)
      .where(
        and(eq(invitation.organizationId, organizationId), eq(invitation.status, TOWER_INVITATION_STATUS.pending))
      ),
    db
      .select({ organizationId: organizationWebflowOAuthToken.organizationId })
      .from(organizationWebflowOAuthToken)
      .where(eq(organizationWebflowOAuthToken.organizationId, organizationId))
      .limit(1),
  ]);

  const hasTeamSubscription = isOrganizationTeamEntitled({
    subscriptionStatus: orgRow.subscriptionStatus,
    billingPlan: orgRow.billingPlan,
    stripeSubscriptionId: orgRow.stripeSubscriptionId,
  });

  return {
    organizationId: orgRow.id,
    organizationName: orgRow.name,
    organizationSlug: orgRow.slug,
    memberCount: memberCountRow?.value ?? 0,
    pendingInviteCount: pendingInviteCountRow?.value ?? 0,
    hasTeamSubscription,
    hasWebflowConnection: Boolean(webflowRow),
    hasTeamPresets: orgRow.beaconTeamSettings != null,
    recoveryDays: WORKSPACE_SOFT_DELETE_RECOVERY_DAYS,
    isRecoverable: true,
  };
}

export function computePurgeScheduledAt(deletedAt: Date): Date {
  const purgeAt = new Date(deletedAt);
  purgeAt.setDate(purgeAt.getDate() + WORKSPACE_SOFT_DELETE_RECOVERY_DAYS);
  return purgeAt;
}
