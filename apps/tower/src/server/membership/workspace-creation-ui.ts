import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import {
  resolveUserWorkspaceCreationEligibility,
  type UserWorkspaceCreationEligibility,
} from "@/server/membership/user-workspace-creation-eligibility";

export type WorkspaceCreationUiEligibility = UserWorkspaceCreationEligibility & {
  /** Whether the sidebar/workspace switcher may offer workspace creation. */
  canShowInSwitcher: boolean;
  /** Active workspace is on Team billing and user lacks individual Pro. */
  viewingTeamWorkspaceWithoutPro: boolean;
};

/**
 * Server-side gate for workspace creation UI. Team membership alone never enables
 * creating another owned workspace. While viewing a paid Team workspace without
 * individual Pro, hide create only after the user already has a free-tier owned
 * workspace — invited editors with zero owned workspaces may still create one.
 */
export async function resolveWorkspaceCreationUiEligibility(
  userId: string,
  activeOrganizationId: string | null
): Promise<WorkspaceCreationUiEligibility> {
  const [eligibility, entitlement] = await Promise.all([
    resolveUserWorkspaceCreationEligibility(userId),
    resolveTowerEntitlement(userId, activeOrganizationId),
  ]);

  const viewingTeamWorkspaceWithoutPro =
    entitlement.tier === "team" && entitlement.source === "workspace_team" && !eligibility.hasIndividualPro;

  const suppressCreateWhileViewingTeam = viewingTeamWorkspaceWithoutPro && eligibility.ownedWorkspaceCount > 0;
  const canShowInSwitcher = eligibility.canCreate && !suppressCreateWhileViewingTeam;

  return {
    ...eligibility,
    canShowInSwitcher,
    viewingTeamWorkspaceWithoutPro,
  };
}
