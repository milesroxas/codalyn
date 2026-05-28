import {
  resolveTowerSignUpFetchOptions,
  signInAfterEmailLinkSignUp,
} from "@/features/auth/lib/team-invitation-auth-fetch-options";
import { authClient } from "@/features/auth/model/auth-client";

type TowerEmailSignUpInput = {
  email: string;
  password: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  verificationCallback: string;
  operatorInviteToken: string | null;
  teamInvitationId: string | null;
  joiningViaTeamInvite: boolean;
};

export type TowerEmailSignUpResult =
  | { kind: "error"; message: string }
  | { kind: "awaiting_verification"; email: string }
  | { kind: "session"; data: NonNullable<Awaited<ReturnType<typeof authClient.signUp.email>>["data"]> };

function hasOnboardingEmailLinkTrust(input: TowerEmailSignUpInput): boolean {
  return input.joiningViaTeamInvite || Boolean(input.operatorInviteToken);
}

async function signUpWithEmailLinkFallback(input: TowerEmailSignUpInput): Promise<TowerEmailSignUpResult> {
  const signInResult = await signInAfterEmailLinkSignUp({
    email: input.email,
    password: input.password,
    verificationCallback: input.verificationCallback,
    operatorInviteToken: input.operatorInviteToken,
    teamInvitationId: input.teamInvitationId,
  });
  if (signInResult.error) {
    return { kind: "error", message: signInResult.error.message ?? "Sign in failed" };
  }
  if (!signInResult.data?.token) {
    return { kind: "error", message: "Sign in failed" };
  }
  return { kind: "session", data: signInResult.data };
}

export async function submitTowerEmailSignUp(input: TowerEmailSignUpInput): Promise<TowerEmailSignUpResult> {
  const { data, error } = await authClient.signUp.email({
    email: input.email,
    password: input.password,
    name: input.displayName,
    firstName: input.firstName,
    lastName: input.lastName,
    callbackURL: input.verificationCallback,
    fetchOptions: resolveTowerSignUpFetchOptions({
      operatorInviteToken: input.operatorInviteToken,
      teamInvitationId: input.teamInvitationId,
      joiningViaTeamInvite: input.joiningViaTeamInvite,
    }),
  });
  if (error) {
    return { kind: "error", message: error.message ?? "Sign up failed" };
  }
  if (data?.token) {
    return { kind: "session", data };
  }
  if (hasOnboardingEmailLinkTrust(input)) {
    return signUpWithEmailLinkFallback(input);
  }
  return { kind: "awaiting_verification", email: input.email };
}
