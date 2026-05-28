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
 * creating another owned workspace; viewing a paid Team workspace hides create unless
 * the user has individual Pro.
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

  const canShowInSwitcher = eligibility.canCreate && !viewingTeamWorkspaceWithoutPro;

  return {
    ...eligibility,
    canShowInSwitcher,
    viewingTeamWorkspaceWithoutPro,
  };
}
