import { APIError } from "better-auth/api";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/shared/lib/db";
import { member, organization } from "@/shared/lib/db/auth-schema";
import { isTowerTeamAdminRole } from "@/shared/lib/membership/tower-organization-access";
import {
  computeUserAccountDeletionPlan,
  formatSoleAdminWorkspacesMessage,
  type OrgMemberSnapshot,
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

/** Deletes sole-member workspaces and blocks when the user is the only admin of a shared workspace. */
export async function prepareUserAccountDeletion(userId: string): Promise<UserAccountDeletionPlan> {
  const plan = await assertUserMayDeleteAccount(userId);
  if (plan.soleMemberOrganizationIds.length === 0) {
    return plan;
  }

  await db.delete(organization).where(inArray(organization.id, plan.soleMemberOrganizationIds));
  return plan;
}
