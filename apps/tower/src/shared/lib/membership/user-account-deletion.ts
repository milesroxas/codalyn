export {
  ACCOUNT_DELETION_BLOCKED_CODE,
  type AccountDeletionBlocker,
  type AccountDeletionBlockReason,
  canPurgeBlockedWorkspaceNow,
  computeAccountDeletionBlockers,
  formatAccountDeletionBlockedMessage,
  type OrganizationOwnershipSnapshot,
  resolveSharedMembershipOrganizationIds,
  type UserAccountDeletionPlan,
} from "@/shared/lib/membership/workspace-ownership";
