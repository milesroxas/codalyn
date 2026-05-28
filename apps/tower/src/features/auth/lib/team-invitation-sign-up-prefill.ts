import type { OperatorInviteSignUpPrefill } from "@/features/auth/lib/operator-invite-client";
import type { TeamInvitationPreview } from "@/shared/lib/membership/team-invitation-accept";
import { TEAM_INVITATION_ACCEPT_COPY } from "@/shared/lib/membership/team-invitation-accept";

const INVALID_TEAM_INVITE_ERROR = TEAM_INVITATION_ACCEPT_COPY.previewLoadingError;

function messageForInvalidTeamInvitationPreview(preview: TeamInvitationPreview | null): string {
  if (!preview || preview.ok) {
    return INVALID_TEAM_INVITE_ERROR;
  }
  if (preview.reason === "expired") {
    return TEAM_INVITATION_ACCEPT_COPY.expiredDescription;
  }
  if (preview.reason === "no_longer_pending") {
    return TEAM_INVITATION_ACCEPT_COPY.unavailableDescription;
  }
  return INVALID_TEAM_INVITE_ERROR;
}

export async function fetchTeamInvitationSignUpPrefill(
  invitationId: string
): Promise<{ ok: true; prefill: OperatorInviteSignUpPrefill } | { ok: false; error: string }> {
  const res = await fetch(`/api/team/invitations/preview?invitationId=${encodeURIComponent(invitationId)}`, {
    credentials: "same-origin",
  });
  if (!res.ok) {
    return { ok: false, error: INVALID_TEAM_INVITE_ERROR };
  }
  const preview = (await res.json().catch(() => null)) as TeamInvitationPreview | null;
  if (!preview?.ok) {
    return { ok: false, error: messageForInvalidTeamInvitationPreview(preview) };
  }
  const email = preview.email.trim();
  if (!email) {
    return { ok: false, error: INVALID_TEAM_INVITE_ERROR };
  }
  return {
    ok: true,
    prefill: {
      email,
      firstName: null,
      lastName: null,
    },
  };
}
