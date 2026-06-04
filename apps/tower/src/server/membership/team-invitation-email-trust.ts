import { markEmailVerifiedForEmail } from "@/server/membership/email-verification-trust";
import { loadTeamInvitationPreview } from "@/server/membership/team-invitation-preview";
import { normalizeAccessEmail } from "@/shared/lib/access/email-input";
import { TOWER_TEAM_INVITATION_HEADER } from "@/shared/lib/membership/team-invitation-header";

export { markEmailVerifiedForUserId } from "@/server/membership/email-verification-trust";

function readTeamInvitationIdFromHeaders(headers: Headers): string | null {
  const value = headers.get(TOWER_TEAM_INVITATION_HEADER)?.trim();
  return value || null;
}

export function readTeamInvitationIdFromAuthContext(ctx: unknown): string | null {
  if (!ctx || typeof ctx !== "object") {
    return null;
  }
  const authCtx = ctx as {
    request?: Request;
    headers?: Headers;
    getHeader?: (name: string) => string | null | undefined;
  };
  if (authCtx.request?.headers) {
    const fromRequest = readTeamInvitationIdFromHeaders(authCtx.request.headers);
    if (fromRequest) {
      return fromRequest;
    }
  }
  if (authCtx.headers) {
    const fromHeaders = readTeamInvitationIdFromHeaders(authCtx.headers);
    if (fromHeaders) {
      return fromHeaders;
    }
  }
  if (typeof authCtx.getHeader === "function") {
    const value = authCtx.getHeader(TOWER_TEAM_INVITATION_HEADER)?.trim();
    return value || null;
  }
  return null;
}

export async function isPendingTeamInvitationForEmail(invitationId: string, email: string): Promise<boolean> {
  const preview = await loadTeamInvitationPreview(invitationId);
  if (!preview.ok) {
    return false;
  }
  return normalizeAccessEmail(preview.email) === normalizeAccessEmail(email);
}

/** Invitation link possession + email match is treated as verified email ownership. */
export async function trustEmailForPendingTeamInvitation(
  email: string,
  invitationId: string | null | undefined
): Promise<boolean> {
  const trimmedInvitationId = invitationId?.trim();
  if (!trimmedInvitationId) {
    return false;
  }
  if (!(await isPendingTeamInvitationForEmail(trimmedInvitationId, email))) {
    return false;
  }
  await markEmailVerifiedForEmail(email);
  return true;
}
