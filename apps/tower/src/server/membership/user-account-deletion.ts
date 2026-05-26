import { APIError } from "better-auth/api";
import { and, eq, inArray, sql } from "drizzle-orm";
import { syncOrganizationSeatQuantityWithStripe } from "@/server/billing/stripe-org-seat-sync";
import { deleteWorkspacesForAccountCleanup } from "@/server/membership/delete-workspace";
import { db } from "@/shared/lib/db";
import { invitation, member, organization, user } from "@/shared/lib/db/auth-schema";
import { TOWER_INVITATION_STATUS } from "@/shared/lib/membership/tower-invitation-status";
import { isTowerTeamAdminRole } from "@/shared/lib/membership/tower-organization-access";
import {
  computeUserAccountDeletionPlan,
  formatSoleAdminWorkspacesMessage,
  type OrgMemberSnapshot,
  resolveSharedMembershipOrganizationIds,
  SOLE_ADMIN_WORKSPACES_CODE,
  type UserAccountDeletionPlan,
  type WorkspaceDeletionBlocker,
} from "@/shared/lib/membership/user-account-deletion";

export {
  SOLE_ADMIN_WORKSPACES_CODE,
  type UserAccountDeletionPlan,
  type WorkspaceDeletionBlocker,
} from "@/shared/lib/membership/user-account-deletion";

export class UserAccountDeletionBlockedError extends Error {
  readonly code = SOLE_ADMIN_WORKSPACES_CODE;
  readonly blockers: WorkspaceDeletionBlocker[];

  constructor(blockers: WorkspaceDeletionBlocker[]) {
    super(formatSoleAdminWorkspacesMessage(blockers));
    this.name = "UserAccountDeletionBlockedError";
    this.blockers = blockers;
  }
}

async function loadOrgMemberSnapshotsForUser(userId: string): Promise<OrgMemberSnapshot[]> {
  const adminMemberships = await db
    .select({
      organizationId: member.organizationId,
      role: member.role,
    })
    .from(member)
    .where(eq(member.userId, userId));

  const adminOrgIds = adminMemberships.filter((row) => isTowerTeamAdminRole(row.role)).map((row) => row.organizationId);
  if (adminOrgIds.length === 0) {
    return [];
  }

  const [orgRows, memberRows] = await Promise.all([
    db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      })
      .from(organization)
      .where(inArray(organization.id, adminOrgIds)),
    db
      .select({
        organizationId: member.organizationId,
        userId: member.userId,
        role: member.role,
      })
      .from(member)
      .where(inArray(member.organizationId, adminOrgIds)),
  ]);

  const membersByOrg = new Map<string, OrgMemberSnapshot["members"]>();
  for (const row of memberRows) {
    const existing = membersByOrg.get(row.organizationId) ?? [];
    existing.push({ userId: row.userId, role: row.role });
    membersByOrg.set(row.organizationId, existing);
  }

  return orgRows.map((orgRow) => ({
    organizationId: orgRow.id,
    organizationName: orgRow.name,
    organizationSlug: orgRow.slug,
    members: membersByOrg.get(orgRow.id) ?? [],
  }));
}

export async function planUserAccountDeletion(userId: string): Promise<UserAccountDeletionPlan> {
  const orgs = await loadOrgMemberSnapshotsForUser(userId);
  return computeUserAccountDeletionPlan(userId, orgs);
}

export async function assertUserMayDeleteAccount(userId: string): Promise<UserAccountDeletionPlan> {
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
 */
async function releaseSharedTeamMembershipsForAccountDeletion(
  userId: string,
  soleMemberOrganizationIds: string[]
): Promise<void> {
  const [userRow] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  if (!userRow) {
    return;
  }

  const memberships = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId));

  const organizationIds = resolveSharedMembershipOrganizationIds(memberships, soleMemberOrganizationIds);
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

/** Deletes sole-member workspaces and blocks when the user is the only admin of a shared workspace. */
export async function prepareUserAccountDeletion(userId: string): Promise<UserAccountDeletionPlan> {
  const plan = await assertUserMayDeleteAccount(userId);
  if (plan.soleMemberOrganizationIds.length > 0) {
    await deleteWorkspacesForAccountCleanup(plan.soleMemberOrganizationIds);
  }

  await releaseSharedTeamMembershipsForAccountDeletion(userId, plan.soleMemberOrganizationIds);
  return plan;
}
