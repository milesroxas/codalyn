export const TEAM_WORKSPACE_TABS = ["people", "invites", "settings", "billing"] as const;

export type TeamWorkspaceTab = (typeof TEAM_WORKSPACE_TABS)[number];

export const DEFAULT_TEAM_WORKSPACE_TAB: TeamWorkspaceTab = "people";

export function parseTeamWorkspaceTab(raw: string | null | undefined): TeamWorkspaceTab {
  const value = raw?.trim().toLowerCase();
  if (value === "invites" || value === "settings" || value === "billing") {
    return value;
  }
  return DEFAULT_TEAM_WORKSPACE_TAB;
}

export function buildTeamPageHref(options?: { tab?: TeamWorkspaceTab | null }): string {
  const tab = options?.tab ?? null;
  if (!tab || tab === DEFAULT_TEAM_WORKSPACE_TAB) {
    return "/team";
  }
  return `/team?tab=${tab}`;
}
