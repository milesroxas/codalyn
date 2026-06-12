export const AUTH_SURFACE_LEGAL_NOTICE_PREFIX = {
  signIn: "By signing in, you agree to our ",
  signUp: "By signing up, you agree to our ",
  generic: "By continuing, you agree to our ",
} as const;

export function resolveSignInCardDescription(input: {
  joiningViaTeamInvite: boolean;
  earlyAccessRequired: boolean;
}): string {
  if (input.joiningViaTeamInvite) {
    return "Sign in with the email that received the workspace invitation.";
  }
  if (input.earlyAccessRequired) {
    return "Sign in with your Tower email and password. Early access is required while Tower is in MVP.";
  }
  return "Sign in with your Tower email and password.";
}

export function resolveSignUpCardDescription(joiningViaTeamInvite: boolean): string {
  if (joiningViaTeamInvite) {
    return "Create your Tower account with the email that received the invitation.";
  }
  return "Start using Tower with Beacon and team features.";
}

export function shouldShowEarlyAccessSignUpGate(input: {
  earlyAccessRequired: boolean;
  operatorInviteToken: string | null;
  operatorInviteParam: string | null;
  joiningViaTeamInvite: boolean;
}): boolean {
  return (
    input.earlyAccessRequired && !input.operatorInviteToken && !input.operatorInviteParam && !input.joiningViaTeamInvite
  );
}
