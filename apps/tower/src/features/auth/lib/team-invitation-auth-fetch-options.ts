import { authClient } from "@/features/auth/model/auth-client";
import { TOWER_OPERATOR_INVITE_HEADER } from "@/shared/lib/access/operator-invite-header";
import { TOWER_SKIP_VERIFICATION_EMAIL_HEADER } from "@/shared/lib/auth/tower-email-verification-header";
import { TOWER_TEAM_INVITATION_HEADER } from "@/shared/lib/membership/team-invitation-header";

function mergeAuthFetchHeaders(
  ...headerGroups: Array<{ headers: Record<string, string> } | undefined>
): { headers: Record<string, string> } | undefined {
  const headers: Record<string, string> = {};
  for (const group of headerGroups) {
    if (!group) {
      continue;
    }
    Object.assign(headers, group.headers);
  }
  return Object.keys(headers).length > 0 ? { headers } : undefined;
}

function buildTeamInvitationAuthFetchOptions(
  invitationId: string | null,
  opts?: { skipVerificationEmail?: boolean }
): { headers: Record<string, string> } | undefined {
  if (!invitationId) {
    return undefined;
  }
  const headers: Record<string, string> = {
    [TOWER_TEAM_INVITATION_HEADER]: invitationId,
  };
  if (opts?.skipVerificationEmail) {
    headers[TOWER_SKIP_VERIFICATION_EMAIL_HEADER] = "1";
  }
  return { headers };
}

function buildOperatorInviteAuthFetchOptions(
  operatorInviteToken: string | null,
  opts?: { skipVerificationEmail?: boolean }
): { headers: Record<string, string> } | undefined {
  if (!operatorInviteToken) {
    return undefined;
  }
  const headers: Record<string, string> = {
    [TOWER_OPERATOR_INVITE_HEADER]: operatorInviteToken,
  };
  if (opts?.skipVerificationEmail) {
    headers[TOWER_SKIP_VERIFICATION_EMAIL_HEADER] = "1";
  }
  return { headers };
}

export function resolveTowerEmailLinkAuthFetchOptions(input: {
  operatorInviteToken: string | null;
  teamInvitationId: string | null;
}): { headers: Record<string, string> } | undefined {
  return mergeAuthFetchHeaders(
    buildTeamInvitationAuthFetchOptions(input.teamInvitationId),
    buildOperatorInviteAuthFetchOptions(input.operatorInviteToken)
  );
}

export function resolveTowerSignUpFetchOptions(input: {
  operatorInviteToken: string | null;
  teamInvitationId: string | null;
  joiningViaTeamInvite: boolean;
}): { headers: Record<string, string> } | undefined {
  const skipVerificationEmail = input.joiningViaTeamInvite || Boolean(input.operatorInviteToken);
  return mergeAuthFetchHeaders(
    buildTeamInvitationAuthFetchOptions(input.teamInvitationId, { skipVerificationEmail }),
    buildOperatorInviteAuthFetchOptions(input.operatorInviteToken, { skipVerificationEmail })
  );
}

export async function signInAfterEmailLinkSignUp(input: {
  email: string;
  password: string;
  verificationCallback: string;
  operatorInviteToken: string | null;
  teamInvitationId: string | null;
}) {
  return authClient.signIn.email({
    email: input.email,
    password: input.password,
    callbackURL: input.verificationCallback,
    fetchOptions: resolveTowerEmailLinkAuthFetchOptions({
      operatorInviteToken: input.operatorInviteToken,
      teamInvitationId: input.teamInvitationId,
    }),
  });
}
