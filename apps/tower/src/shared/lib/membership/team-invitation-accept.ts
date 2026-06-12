export const TEAM_INVITATION_ACCEPT_PATH = "/invitations/accept";

export function buildTeamInvitationAcceptPath(invitationId: string): string {
  return `${TEAM_INVITATION_ACCEPT_PATH}?invitationId=${encodeURIComponent(invitationId)}`;
}

export function isTeamInvitationAcceptPath(path: string): boolean {
  return path.startsWith(TEAM_INVITATION_ACCEPT_PATH);
}

export function readTeamInvitationIdFromSearchParams(searchParams: URLSearchParams): string | null {
  const invitationId = searchParams.get("invitationId")?.trim();
  return invitationId || null;
}

export type TeamInvitationPreviewReason = "not_found" | "expired" | "no_longer_pending";

export type TeamInvitationPreview =
  | {
      ok: true;
      organizationName: string;
      email: string;
      role: string;
      inviterName: string;
    }
  | {
      ok: false;
      reason: TeamInvitationPreviewReason;
      organizationName?: string;
      email?: string;
    };

export const TEAM_INVITATION_ACCEPT_COPY = {
  missingInvitation: "This invitation link is missing an ID. Open the link from your email again.",
  previewLoadingError: "We could not load this invitation. Try opening the link from your email again.",
  expiredTitle: "Invitation expired",
  expiredDescription: "Ask your workspace admin to send a new invitation.",
  unavailableTitle: "Invitation unavailable",
  unavailableDescription: "This invitation is no longer active. Ask your workspace admin for a new link.",
  verificationRedirectTitle: "Verification link expired",
  verificationRedirectDescription: (email: string, organizationName: string) =>
    `Your email verification link is no longer valid. Sign in as ${email} to finish joining ${organizationName}.`,
  joinTitle: "Join workspace",
  joinDescription: (input: { organizationName: string; inviterName: string; role: string; email: string }) =>
    `${input.inviterName} invited you to join ${input.organizationName} as ${input.role}. Use ${input.email} to continue.`,
  signInLabel: "Sign in",
  createAccountLabel: "Create account",
  joiningLabel: "Joining workspace…",
  successToast: "You joined the workspace",
  wrongAccountTitle: "Wrong account",
  wrongAccountDescription: (signedInEmail: string, invitedEmail: string) =>
    `You're signed in as ${signedInEmail}, but this invitation was sent to ${invitedEmail}. Sign out and continue with the invited email.`,
  signOutLabel: "Sign out",
  goToTeamLabel: "Go to Team",
  backToHomeLabel: "Back to home",
} as const;

export function isTeamInvitationVerificationRedirectError(error: string | null | undefined): boolean {
  if (!error?.trim()) {
    return false;
  }
  const normalized = error.trim().toLowerCase();
  return normalized === "invalid_token" || normalized === "token_expired";
}

export type TeamInvitationAcceptErrorKind =
  | "email_verification_required"
  | "email_mismatch"
  | "invitation_unavailable"
  | "seat_limit"
  | "already_member"
  | "unknown";

export function classifyTeamInvitationAcceptError(error: {
  message?: string;
  code?: string;
}): TeamInvitationAcceptErrorKind {
  const message = error.message?.toLowerCase() ?? "";
  const code = error.code?.toLowerCase() ?? "";

  if (
    code.includes("email_verification_required") ||
    message.includes("email verification required before accepting")
  ) {
    return "email_verification_required";
  }
  if (
    code.includes("not_the_recipient") ||
    code.includes("you_are_not_the_recipient") ||
    message.includes("not the recipient")
  ) {
    return "email_mismatch";
  }
  if (
    code.includes("invitation_not_found") ||
    message.includes("invitation not found") ||
    message.includes("failed to retrieve invitation")
  ) {
    return "invitation_unavailable";
  }
  if (
    code.includes("membership_limit") ||
    message.includes("seat limit") ||
    message.includes("membership limit") ||
    message.includes("exceeds its seat limit")
  ) {
    return "seat_limit";
  }
  if (code.includes("already_a_member") || message.includes("already a member")) {
    return "already_member";
  }
  return "unknown";
}

export function messageForTeamInvitationAcceptError(
  kind: TeamInvitationAcceptErrorKind,
  fallbackMessage?: string
): string {
  switch (kind) {
    case "email_verification_required":
      return "Verify your email before joining this workspace.";
    case "email_mismatch":
      return "This invitation was sent to a different email address.";
    case "invitation_unavailable":
      return "This invitation is invalid or has expired. Ask your workspace admin for a new one.";
    case "seat_limit":
      return "This workspace has no open seats. Ask your workspace admin to resolve billing or remove members.";
    case "already_member":
      return "You're already a member of this workspace.";
    default:
      return fallbackMessage?.trim() || "We couldn't accept this invitation. Try again or ask for a new link.";
  }
}
