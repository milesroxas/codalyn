export class TeamInvitationApiError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "TeamInvitationApiError";
    this.code = code;
  }
}

export async function deleteTeamInvitation(input: { invitationId: string; organizationId: string }): Promise<void> {
  const res = await fetch("/api/team/invitations/delete", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new TeamInvitationApiError(body?.error ?? "delete_failed");
  }
}

export function formatTeamInvitationDeleteError(error: TeamInvitationApiError): string {
  switch (error.code) {
    case "forbidden":
      return "Only workspace admins can delete invitations.";
    case "not_found":
      return "Invitation not found.";
    case "org_mismatch":
      return "Invitation does not belong to this workspace.";
    default:
      return "Could not delete invitation.";
  }
}
