export type WorkspaceCreationEligibilityPayload = {
  canCreate: boolean;
  ownedWorkspaceCount: number;
};

export function parseWorkspaceCreationEligibilityPayload(raw: unknown): WorkspaceCreationEligibilityPayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  if (typeof record.canCreate !== "boolean") {
    return null;
  }
  const owned = record.ownedWorkspaceCount;
  if (typeof owned !== "number" || !Number.isFinite(owned) || owned < 0) {
    return null;
  }
  return { canCreate: record.canCreate, ownedWorkspaceCount: Math.floor(owned) };
}
