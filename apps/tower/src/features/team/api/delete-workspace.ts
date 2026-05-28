export class TeamWorkspaceApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TeamWorkspaceApiError";
    this.status = status;
  }
}

export function formatTeamWorkspaceDeleteError(error: TeamWorkspaceApiError): string {
  if (error.message === "confirm_mismatch") {
    return "Slug does not match.";
  }
  if (error.message === "forbidden") {
    return "You do not have permission to delete this workspace.";
  }
  if (error.message === "rate_limited") {
    return "Too many delete attempts. Wait a few minutes and try again.";
  }
  if (error.message === "deletion_incomplete") {
    return "Billing was canceled but deletion did not finish. Try again.";
  }
  return error.message;
}

export async function deleteTeamWorkspace(
  organizationId: string,
  confirmSlug: string,
  password: string
): Promise<{ ok: true }> {
  const res = await fetch("/api/team/workspace/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ organizationId, confirmSlug, password }),
  });
  const payload = (await res.json().catch(() => null)) as { ok?: true; error?: string } | null;
  if (!res.ok) {
    throw new TeamWorkspaceApiError(payload?.error ?? "delete_failed", res.status);
  }
  return { ok: true };
}
