import {
  isTeamInvitationAcceptPath,
  readTeamInvitationIdFromSearchParams,
} from "@/shared/lib/membership/team-invitation-accept";

/** Passed on email sign-up/sign-in when the user arrived via a team invitation accept link. */
export const TOWER_TEAM_INVITATION_HEADER = "x-codalyn-team-invitation";

export function readTeamInvitationIdFromCallbackPath(callbackPath: string): string | null {
  const queryIndex = callbackPath.indexOf("?");
  const pathname = queryIndex === -1 ? callbackPath : callbackPath.slice(0, queryIndex);
  if (!isTeamInvitationAcceptPath(pathname)) {
    return null;
  }
  const search = queryIndex === -1 ? "" : callbackPath.slice(queryIndex + 1);
  return readTeamInvitationIdFromSearchParams(new URLSearchParams(search));
}
