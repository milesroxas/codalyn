import {
  isTeamInvitationAcceptPath,
  readTeamInvitationAcceptTokenFromSearchParams,
  readTeamInvitationIdFromSearchParams,
  TEAM_INVITATION_ACCEPT_TOKEN_PARAM,
} from "@/shared/lib/membership/team-invitation-accept";

export { TEAM_INVITATION_ACCEPT_TOKEN_PARAM };

/** Passed on email sign-up/sign-in when the user arrived via a team invitation accept link. */
export const TOWER_TEAM_INVITATION_HEADER = "x-codalyn-team-invitation";

/** Carries the secret acceptance token (email-ownership proof) from the invite link to sign-up/sign-in. */
export const TOWER_TEAM_INVITE_ACCEPT_TOKEN_HEADER = "x-codalyn-team-invite-accept";

function readAcceptSearch(callbackPath: string): URLSearchParams | null {
  const queryIndex = callbackPath.indexOf("?");
  const pathname = queryIndex === -1 ? callbackPath : callbackPath.slice(0, queryIndex);
  if (!isTeamInvitationAcceptPath(pathname)) {
    return null;
  }
  return new URLSearchParams(queryIndex === -1 ? "" : callbackPath.slice(queryIndex + 1));
}

export function readTeamInvitationIdFromCallbackPath(callbackPath: string): string | null {
  const search = readAcceptSearch(callbackPath);
  return search ? readTeamInvitationIdFromSearchParams(search) : null;
}

export function readTeamInviteAcceptTokenFromCallbackPath(callbackPath: string): string | null {
  const search = readAcceptSearch(callbackPath);
  return search ? readTeamInvitationAcceptTokenFromSearchParams(search) : null;
}
