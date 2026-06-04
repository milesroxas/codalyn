/** Days after soft delete before workspace rows are permanently purged. */
export const WORKSPACE_SOFT_DELETE_RECOVERY_DAYS = 30;

/** Pending ownership transfer expires after this many days. */
export const WORKSPACE_OWNERSHIP_TRANSFER_EXPIRY_DAYS = 14;

export const ACCOUNT_DELETION_BLOCKED_CODE = "account_deletion_blocked";

export type AccountDeletionBlockReason =
  | "workspace_owner"
  | "sole_owner_workspace"
  | "billing_owner"
  | "workspace_pending_deletion";

export type AccountDeletionBlocker = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  reason: AccountDeletionBlockReason;
  memberCount: number;
  otherMemberCount: number;
  hasTeamSubscription: boolean;
};

export type UserAccountDeletionPlan = {
  blockers: AccountDeletionBlocker[];
};

export type OrganizationOwnershipSnapshot = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  ownerUserId: string;
  billingOwnerUserId: string | null;
  hasTeamSubscription: boolean;
  memberCount: number;
  deletedAt: Date | null;
};

function isSharedWorkspace(memberCount: number): boolean {
  return memberCount > 1;
}

export function computeAccountDeletionBlockers(
  userId: string,
  orgs: readonly OrganizationOwnershipSnapshot[]
): AccountDeletionBlocker[] {
  const blockers: AccountDeletionBlocker[] = [];

  for (const org of orgs) {
    if (org.deletedAt != null) {
      if (org.ownerUserId === userId) {
        const otherMemberCount = Math.max(0, org.memberCount - 1);
        blockers.push({
          organizationId: org.organizationId,
          organizationName: org.organizationName,
          organizationSlug: org.organizationSlug,
          reason: "workspace_pending_deletion",
          memberCount: org.memberCount,
          otherMemberCount,
          hasTeamSubscription: org.hasTeamSubscription,
        });
      }
      continue;
    }

    const otherMemberCount = Math.max(0, org.memberCount - 1);
    const isOwner = org.ownerUserId === userId;
    const isBillingOwner = org.billingOwnerUserId === userId && org.hasTeamSubscription;

    if (isOwner && isSharedWorkspace(org.memberCount)) {
      blockers.push({
        organizationId: org.organizationId,
        organizationName: org.organizationName,
        organizationSlug: org.organizationSlug,
        reason: "workspace_owner",
        memberCount: org.memberCount,
        otherMemberCount,
        hasTeamSubscription: org.hasTeamSubscription,
      });
      continue;
    }

    if (isOwner && org.memberCount === 1) {
      blockers.push({
        organizationId: org.organizationId,
        organizationName: org.organizationName,
        organizationSlug: org.organizationSlug,
        reason: "sole_owner_workspace",
        memberCount: org.memberCount,
        otherMemberCount,
        hasTeamSubscription: org.hasTeamSubscription,
      });
      continue;
    }

    if (isBillingOwner) {
      blockers.push({
        organizationId: org.organizationId,
        organizationName: org.organizationName,
        organizationSlug: org.organizationSlug,
        reason: "billing_owner",
        memberCount: org.memberCount,
        otherMemberCount,
        hasTeamSubscription: org.hasTeamSubscription,
      });
    }
  }

  return blockers;
}

function formatBlockerResolution(blocker: AccountDeletionBlocker): string {
  const memberLabel = blocker.otherMemberCount === 1 ? "member" : "members";

  switch (blocker.reason) {
    case "workspace_owner":
      return `“${blocker.organizationName}” has ${blocker.otherMemberCount} other ${memberLabel}. Transfer workspace ownership to another member, or delete the workspace through Team settings.`;
    case "sole_owner_workspace":
      return `“${blocker.organizationName}” is your personal workspace. Delete it through Team settings before deleting your account.`;
    case "billing_owner":
      return `“${blocker.organizationName}” has an active Team subscription billed to you. Transfer billing ownership, cancel billing in Team settings, or delete the workspace.`;
    case "workspace_pending_deletion":
      return `“${blocker.organizationName}” is scheduled for deletion. Wait until it is fully removed (${WORKSPACE_SOFT_DELETE_RECOVERY_DAYS} days) before deleting your account.`;
  }
}

export function formatAccountDeletionBlockedMessage(blockers: AccountDeletionBlocker[]): string {
  if (blockers.length === 0) {
    return "Resolve workspace ownership and billing responsibilities before deleting this account.";
  }
  if (blockers.length === 1) {
    return formatBlockerResolution(blockers[0]);
  }
  const notes = blockers.map((blocker) => formatBlockerResolution(blocker)).join(" ");
  return `Resolve ${blockers.length} workspace responsibilities before deleting your account. ${notes}`;
}

export function resolveSharedMembershipOrganizationIds(
  memberships: readonly { organizationId: string }[],
  ownedOrganizationIds: readonly string[]
): string[] {
  const excluded = new Set(ownedOrganizationIds);
  const orgIds = memberships.map((row) => row.organizationId).filter((id) => !excluded.has(id));
  return [...new Set(orgIds)];
}
