export {
  ACCOUNT_DELETION_BLOCKED_CODE,
  type AccountDeletionBlocker,
  type AccountDeletionBlockReason,
  computeAccountDeletionBlockers,
  formatAccountDeletionBlockedMessage,
  formatAccountDeletionBlockedMessage as formatSoleAdminWorkspacesMessage,
  type OrganizationOwnershipSnapshot,
  resolveSharedMembershipOrganizationIds,
  type UserAccountDeletionPlan,
} from "@/shared/lib/membership/workspace-ownership";

/** Backward-compatible alias for account deletion blockers in UI and API responses. */
export type WorkspaceDeletionBlocker = import("@/shared/lib/membership/workspace-ownership").AccountDeletionBlocker;

/** Backward-compatible error code for Better Auth deleteUser responses. */
export const SOLE_ADMIN_WORKSPACES_CODE = "account_deletion_blocked";
