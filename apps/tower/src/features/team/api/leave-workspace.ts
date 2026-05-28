export class TeamWorkspaceLeaveApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TeamWorkspaceLeaveApiError";
    this.status = status;
  }
}

export function formatTeamWorkspaceLeaveError(error: TeamWorkspaceLeaveApiError): string {
  switch (error.message) {
    case "workspace_owner":
      return "Workspace owners must transfer ownership or delete the workspace before leaving.";
    case "billing_owner":
      return "Transfer billing responsibility before leaving this workspace.";
    case "not_member":
      return "You are not a member of this workspace.";
    case "forbidden":
      return "You cannot leave this workspace.";
    case "not_found":
      return "Workspace not found.";
    default:
      return error.message;
  }
}

export async function leaveTeamWorkspace(organizationId: string): Promise<{ ok: true }> {
  const res = await fetch("/api/team/workspace/leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ organizationId }),
  });
  const payload = (await res.json().catch(() => null)) as { ok?: true; error?: string } | null;
  if (!res.ok) {
    throw new TeamWorkspaceLeaveApiError(payload?.error ?? "leave_failed", res.status);
  }
  return { ok: true };
}
