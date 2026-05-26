import { isTowerTeamAdminRole } from "@/shared/lib/membership/tower-organization-access";

export const SOLE_ADMIN_WORKSPACES_CODE = "sole_admin_workspaces";

export type WorkspaceDeletionBlocker = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  otherMemberCount: number;
};

export type UserAccountDeletionPlan = {
  blockers: WorkspaceDeletionBlocker[];
  soleMemberOrganizationIds: string[];
};

export type OrgMemberSnapshot = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  members: { userId: string; role: string }[];
};

export function computeUserAccountDeletionPlan(userId: string, orgs: OrgMemberSnapshot[]): UserAccountDeletionPlan {
  const blockers: WorkspaceDeletionBlocker[] = [];
  const soleMemberOrganizationIds: string[] = [];

  for (const org of orgs) {
    const userMembership = org.members.find((m) => m.userId === userId);
    if (!userMembership || !isTowerTeamAdminRole(userMembership.role)) {
      continue;
    }

    const adminCount = org.members.filter((m) => isTowerTeamAdminRole(m.role)).length;
    const memberCount = org.members.length;
    const otherMemberCount = memberCount - 1;

    if (adminCount === 1 && memberCount > 1) {
      blockers.push({
        organizationId: org.organizationId,
        organizationName: org.organizationName,
        organizationSlug: org.organizationSlug,
        otherMemberCount,
      });
      continue;
    }

    if (adminCount === 1 && memberCount === 1) {
      soleMemberOrganizationIds.push(org.organizationId);
    }
  }

  return { blockers, soleMemberOrganizationIds };
}

/** Shared workspaces where membership should be released before the user row is deleted. */
export function resolveSharedMembershipOrganizationIds(
  memberships: readonly { organizationId: string }[],
  soleMemberOrganizationIds: readonly string[]
): string[] {
  const excluded = new Set(soleMemberOrganizationIds);
  const orgIds = memberships.map((row) => row.organizationId).filter((id) => !excluded.has(id));
  return [...new Set(orgIds)];
}

export function formatSoleAdminWorkspacesMessage(blockers: WorkspaceDeletionBlocker[]): string {
  if (blockers.length === 0) {
    return "Promote another member to admin before deleting this account.";
  }
  if (blockers.length === 1) {
    const workspace = blockers[0];
    const memberLabel = workspace.otherMemberCount === 1 ? "member" : "members";
    return `You are the only admin of “${workspace.organizationName}”, which has ${workspace.otherMemberCount} other ${memberLabel}. Promote another member to admin in Team settings before deleting this account.`;
  }
  const names = blockers.map((workspace) => `“${workspace.organizationName}”`).join(", ");
  return `You are the only admin of ${blockers.length} workspaces (${names}). Promote another admin in Team settings for each workspace before deleting this account.`;
}
