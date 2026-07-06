import { sendTransactionalEmail } from "@/server/email/resend-send";
import { signTeamInvitationAcceptToken } from "@/server/membership/team-invitation-accept-token";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { TEAM_INVITATION_ACCEPT_TOKEN_PARAM } from "@/shared/lib/membership/team-invitation-header";

/**
 * Team invitation email (Better Auth organization `sendInvitationEmail`).
 * Link target: `/invitations/accept` (user must sign in with the invited email, then accept).
 */
export async function sendOrganizationInvitationEmail(data: {
  id: string;
  role: string;
  email: string;
  organization: { id: string; name: string };
  inviter: { user: { name: string | null; email?: string | null } };
  invitation: { id: string };
}): Promise<void> {
  const base = resolveTowerPublicBaseUrl();
  // Secret, recipient-only proof of inbox ownership. Minted here (server-side, never returned to the
  // inviter) and embedded ONLY in this email, so clicking through auto-verifies the invited email —
  // no separate verification step — without letting the inviter forge a verified account.
  const acceptToken = signTeamInvitationAcceptToken(data.invitation.id, data.email);
  const acceptPath = `/invitations/accept?invitationId=${encodeURIComponent(data.invitation.id)}&${TEAM_INVITATION_ACCEPT_TOKEN_PARAM}=${encodeURIComponent(acceptToken)}`;
  const acceptUrl = `${base}${acceptPath}`;
  const inviterName = data.inviter.user.name?.trim() || data.inviter.user.email || "A teammate";
  const orgName = data.organization.name;
  const subject = `You’re invited to ${orgName} on Tower`;
  const text = [
    `${inviterName} invited you to join ${orgName} as ${data.role}.`,
    "",
    `Open this link to sign in (use ${data.email}) and accept:`,
    acceptUrl,
    "",
    "If you didn’t expect this, you can ignore this email.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p><strong>${escapeHtml(inviterName)}</strong> invited you to join <strong>${escapeHtml(orgName)}</strong> as <strong>${escapeHtml(data.role)}</strong>.</p>
  <p><a href="${escapeHtml(acceptUrl)}" style="color: #171717;">Accept invitation</a></p>
  <p style="font-size: 14px; color: #525252;">Use <strong>${escapeHtml(data.email)}</strong> when signing in or creating your account.</p>
  <p style="font-size: 12px; color: #737373;">If you didn’t expect this, you can ignore this email.</p>
</body>
</html>`;

  await sendTransactionalEmail({
    to: data.email,
    subject,
    html,
    text,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
