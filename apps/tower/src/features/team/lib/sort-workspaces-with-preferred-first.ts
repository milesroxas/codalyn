export type WorkspaceOrgSortRow = { id: string };

/** Starred (preferred) workspace first; other workspaces keep their relative order. */
export function sortWorkspacesWithPreferredFirst<T extends WorkspaceOrgSortRow>(
  workspaces: T[],
  preferredOrgId: string | undefined
): T[] {
  if (!preferredOrgId || workspaces.length < 2) {
    return workspaces;
  }
  const preferredIndex = workspaces.findIndex((w) => w.id === preferredOrgId);
  if (preferredIndex <= 0) {
    return workspaces;
  }
  const preferred = workspaces[preferredIndex];
  const rest = workspaces.filter((_, index) => index !== preferredIndex);
  return [preferred, ...rest];
}
