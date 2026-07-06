import type { AccountDeletionBlocker } from "@/shared/lib/membership/user-account-deletion";
import { WORKSPACE_SOFT_DELETE_RECOVERY_DAYS } from "@/shared/lib/membership/workspace-ownership";

/** One-line status under the workspace name in the account-deletion blocker list. */
export function accountWorkspacePurgeRowHint(blocker: AccountDeletionBlocker): string {
  switch (blocker.reason) {
    case "workspace_pending_deletion":
      return `Scheduled for deletion — removed automatically within ${WORKSPACE_SOFT_DELETE_RECOVERY_DAYS} days.`;
    case "sole_owner_workspace":
      return "Personal workspace — only you are a member.";
    default:
      return "";
  }
}

/** Consequence sentence for the purge dialog, before the confirm instructions. */
export function accountWorkspacePurgeConsequence(blocker: AccountDeletionBlocker): string {
  return blocker.reason === "workspace_pending_deletion"
    ? "is deleted immediately instead of waiting out the recovery window. This cannot be undone."
    : "and all of its data are deleted immediately — there is no recovery window and this cannot be undone.";
}

/**
 * Billing disclosure for the purge dialog. Only active workspaces still carry a subscription —
 * scheduling deletion already cancels billing, so pending-deletion purges have nothing to disclose.
 */
export function accountWorkspacePurgeBillingNotice(blocker: AccountDeletionBlocker): string | null {
  if (blocker.reason !== "sole_owner_workspace" || !blocker.hasTeamSubscription) {
    return null;
  }
  return "Your active Team subscription is canceled.";
}
