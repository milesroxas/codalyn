import { APIError } from "better-auth/api";
import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import { isOrganizationTeamEntitled } from "@/server/billing/organization-billing";
import { syncOrganizationSeatQuantityWithStripe } from "@/server/billing/stripe-org-seat-sync";
import { cancelPendingInvitationsForEmail } from "@/server/membership/invitation-hygiene";
import { db } from "@/shared/lib/db";
import {
  earlyAccessRequest,
  flintBetaGroupRequest,
  invitation,
  member,
  organization,
  supportRequest,
  towerOperatorInviteRedemption,
  user,
} from "@/shared/lib/db/auth-schema";
import { TOWER_INVITATION_STATUS } from "@/shared/lib/membership/tower-invitation-status";
import {
  ACCOUNT_DELETION_BLOCKED_CODE,
  computeAccountDeletionBlockers,
  formatAccountDeletionBlockedMessage,
  type OrganizationOwnershipSnapshot,
  resolveSharedMembershipOrganizationIds,
  type UserAccountDeletionPlan,
} from "@/shared/lib/membership/workspace-ownership";

export {
  ACCOUNT_DELETION_BLOCKED_CODE,
  type OrganizationOwnershipSnapshot,
  type UserAccountDeletionPlan,
} from "@/shared/lib/membership/workspace-ownership";

export type AccountDeletionBlocker = import("@/shared/lib/membership/workspace-ownership").AccountDeletionBlocker;

export class UserAccountDeletionBlockedError extends Error {
  readonly code = ACCOUNT_DELETION_BLOCKED_CODE;
  readonly blockers: AccountDeletionBlocker[];

  constructor(blockers: AccountDeletionBlocker[]) {
    super(formatAccountDeletionBlockedMessage(blockers));
    this.name = "UserAccountDeletionBlockedError";
    this.blockers = blockers;
  }
}

async function loadOrganizationOwnershipSnapshotsForUser(userId: string): Promise<OrganizationOwnershipSnapshot[]> {
  const memberships = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId));

  const orgIds = [...new Set(memberships.map((row) => row.organizationId))];
  if (orgIds.length === 0) {
    return [];
  }

  const [orgRows, memberRows] = await Promise.all([
    db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        ownerUserId: organization.ownerUserId,
        billingOwnerUserId: organization.billingOwnerUserId,
        subscriptionStatus: organization.subscriptionStatus,
        billingPlan: organization.billingPlan,
        stripeSubscriptionId: organization.stripeSubscriptionId,
        deletedAt: organization.deletedAt,
      })
      .from(organization)
      .where(inArray(organization.id, orgIds)),
    db
      .select({
        organizationId: member.organizationId,
        userId: member.userId,
      })
      .from(member)
      .where(inArray(member.organizationId, orgIds)),
  ]);

  const memberCountByOrg = new Map<string, number>();
  for (const row of memberRows) {
    memberCountByOrg.set(row.organizationId, (memberCountByOrg.get(row.organizationId) ?? 0) + 1);
  }

  return orgRows.map((orgRow) => ({
    organizationId: orgRow.id,
    organizationName: orgRow.name,
    organizationSlug: orgRow.slug,
    ownerUserId: orgRow.ownerUserId,
    billingOwnerUserId: orgRow.billingOwnerUserId,
    hasTeamSubscription: isOrganizationTeamEntitled({
      subscriptionStatus: orgRow.subscriptionStatus,
      billingPlan: orgRow.billingPlan,
      stripeSubscriptionId: orgRow.stripeSubscriptionId,
    }),
    memberCount: memberCountByOrg.get(orgRow.id) ?? 0,
    deletedAt: orgRow.deletedAt ?? null,
  }));
}

export async function planUserAccountDeletion(userId: string): Promise<UserAccountDeletionPlan> {
  const orgs = await loadOrganizationOwnershipSnapshotsForUser(userId);
  return { blockers: computeAccountDeletionBlockers(userId, orgs) };
}

async function assertUserMayDeleteAccount(userId: string): Promise<UserAccountDeletionPlan> {
  const plan = await planUserAccountDeletion(userId);
  if (plan.blockers.length > 0) {
    throw new UserAccountDeletionBlockedError(plan.blockers);
  }
  return plan;
}

export function toUserAccountDeletionApiError(error: UserAccountDeletionBlockedError): APIError {
  return new APIError("BAD_REQUEST", {
    message: error.message,
    code: error.code,
    blockers: error.blockers,
  });
}

/**
 * Releases shared-workspace seats when a member deletes their account: marks accepted invites,
 * removes membership rows, and syncs Stripe before the user row is deleted.
 * Does not delete or modify workspaces the user owns.
 */
async function releaseSharedTeamMembershipsForAccountDeletion(
  userId: string,
  ownedOrganizationIds: string[]
): Promise<void> {
  const [userRow] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  if (!userRow) {
    return;
  }

  const memberships = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId));

  const organizationIds = resolveSharedMembershipOrganizationIds(memberships, ownedOrganizationIds);
  if (organizationIds.length === 0) {
    return;
  }

  const normalizedEmail = userRow.email.trim().toLowerCase();

  await db
    .update(invitation)
    .set({ status: TOWER_INVITATION_STATUS.accountDeleted })
    .where(
      and(
        inArray(invitation.organizationId, organizationIds),
        sql`lower(${invitation.email}) = ${normalizedEmail}`,
        eq(invitation.status, TOWER_INVITATION_STATUS.accepted)
      )
    );

  await db.delete(member).where(and(eq(member.userId, userId), inArray(member.organizationId, organizationIds)));

  await Promise.all(organizationIds.map((organizationId) => syncOrganizationSeatQuantityWithStripe(organizationId)));
}

/**
 * Privacy Policy §6 ("When you delete your account ... we delete or anonymize personal information"):
 * the rows that outlive the `user` row and carry the address in plain text. Access requests (name, note,
 * team e-mails) are removed outright; support requests, operator-invite redemptions and non-pending team
 * invitations keep their operational content with the address replaced by a per-row, non-reversible
 * placeholder (`deleted-<row key>@deleted.invalid`), so no surviving record identifies the person.
 * Pending invitations were cancelled just before by `cancelPendingInvitationsForEmail`.
 */
export async function anonymizePersonalDataForDeletedAccount(userId: string, email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return;
  }

  await db.delete(earlyAccessRequest).where(sql`lower(${earlyAccessRequest.email}) = ${normalizedEmail}`);
  await db.delete(flintBetaGroupRequest).where(sql`lower(${flintBetaGroupRequest.email}) = ${normalizedEmail}`);

  await db
    .update(supportRequest)
    .set({ email: sql`'deleted-' || ${supportRequest.id} || '@deleted.invalid'` })
    .where(or(eq(supportRequest.userId, userId), sql`lower(${supportRequest.email}) = ${normalizedEmail}`));

  await db
    .update(towerOperatorInviteRedemption)
    .set({ email: sql`'deleted-' || left(${towerOperatorInviteRedemption.tokenHash}, 16) || '@deleted.invalid'` })
    .where(sql`lower(${towerOperatorInviteRedemption.email}) = ${normalizedEmail}`);

  await db
    .update(invitation)
    .set({ email: sql`'deleted-' || ${invitation.id} || '@deleted.invalid'` })
    .where(
      and(sql`lower(${invitation.email}) = ${normalizedEmail}`, ne(invitation.status, TOWER_INVITATION_STATUS.pending))
    );
}

/**
 * Validates account deletion eligibility, releases non-owner memberships and anonymizes the personal data
 * that outlives the user row. Workspaces are never modified.
 */
export async function prepareUserAccountDeletion(userId: string): Promise<UserAccountDeletionPlan> {
  const plan = await assertUserMayDeleteAccount(userId);

  const snapshots = await loadOrganizationOwnershipSnapshotsForUser(userId);
  const ownedOrganizationIds = snapshots
    .filter((org) => org.ownerUserId === userId && org.deletedAt == null)
    .map((org) => org.organizationId);

  await releaseSharedTeamMembershipsForAccountDeletion(userId, ownedOrganizationIds);

  const [userRow] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  if (userRow) {
    await cancelPendingInvitationsForEmail(userRow.email);
    await anonymizePersonalDataForDeletedAccount(userId, userRow.email);
  }

  return plan;
}
