import { OPERATOR_WORKSPACE_PURGE_CONFIRM_PHRASE } from "@/shared/lib/membership/workspace-deletion";
import { WORKSPACE_SOFT_DELETE_RECOVERY_DAYS } from "@/shared/lib/membership/workspace-ownership";

export { OPERATOR_WORKSPACE_PURGE_CONFIRM_PHRASE };

export function operatorWorkspaceScheduledDeletionDescription(purgeScheduledAt: string | null): string {
  const purgeLine = purgeScheduledAt
    ? `Automatic purge is scheduled for ${new Date(purgeScheduledAt).toLocaleString()}.`
    : `Automatic purge runs after the ${WORKSPACE_SOFT_DELETE_RECOVERY_DAYS}-day recovery window.`;
  return `Members already lost access. ${purgeLine} Operators can permanently remove the workspace now to release ownership for account deletion.`;
}
