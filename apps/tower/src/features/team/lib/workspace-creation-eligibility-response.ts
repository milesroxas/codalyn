export type WorkspaceCreationEligibilityPayload = {
  canCreate: boolean;
  canShowInSwitcher: boolean;
  ownedWorkspaceCount: number;
  hasIndividualPro: boolean;
  viewingTeamWorkspaceWithoutPro: boolean;
};

export function parseWorkspaceCreationEligibilityPayload(raw: unknown): WorkspaceCreationEligibilityPayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  if (
    typeof record.canCreate !== "boolean" ||
    typeof record.canShowInSwitcher !== "boolean" ||
    typeof record.hasIndividualPro !== "boolean" ||
    typeof record.viewingTeamWorkspaceWithoutPro !== "boolean"
  ) {
    return null;
  }
  const owned = record.ownedWorkspaceCount;
  if (typeof owned !== "number" || !Number.isFinite(owned) || owned < 0) {
    return null;
  }
  return {
    canCreate: record.canCreate,
    canShowInSwitcher: record.canShowInSwitcher,
    ownedWorkspaceCount: Math.floor(owned),
    hasIndividualPro: record.hasIndividualPro,
    viewingTeamWorkspaceWithoutPro: record.viewingTeamWorkspaceWithoutPro,
  };
}
