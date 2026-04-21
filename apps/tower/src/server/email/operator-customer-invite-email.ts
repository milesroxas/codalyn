import { sendTransactionalEmail } from "@/server/email/resend-send";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * New customer: sign-up link with operator invite token (redeemed after account creation).
 */
export async function sendOperatorNewCustomerInviteEmail(data: {
  email: string;
  inviteUrl: string;
  inviterLabel: string;
}): Promise<void> {
  const subject = "You’re invited to Tower";
  const text = [
    `${data.inviterLabel} invited you to create a Tower account and a team workspace.`,
    "",
    `Use this link (sign up with ${data.email}):`,
    data.inviteUrl,
    "",
    "If you didn’t expect this, you can ignore this email.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p><strong>${escapeHtml(data.inviterLabel)}</strong> invited you to create a Tower account and a team workspace.</p>
  <p><a href="${escapeHtml(data.inviteUrl)}" style="color: #171717;">Create your account</a></p>
  <p style="font-size: 14px; color: #525252;">Use <strong>${escapeHtml(data.email)}</strong> when signing up.</p>
  <p style="font-size: 12px; color: #737373;">If you didn’t expect this, you can ignore this email.</p>
</body>
</html>`;
  await sendTransactionalEmail({ to: data.email, subject, html, text });
}

/**
 * Existing user: team workspace creation was enabled on their account.
 */
export async function sendOperatorExistingUserTeamEligibleEmail(data: {
  email: string;
  inviterLabel: string;
}): Promise<void> {
  const base = resolveTowerPublicBaseUrl();
  const teamPath = "/team";
  const teamUrl = `${base}${teamPath}`;
  const subject = "Your Tower account can create a team workspace";
  const text = [
    `${data.inviterLabel} enabled team workspace creation on your Tower account.`,
    "",
    `Open Team to create or open a workspace:`,
    teamUrl,
    "",
    "If you didn’t expect this, contact your administrator.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p><strong>${escapeHtml(data.inviterLabel)}</strong> enabled team workspace creation on your Tower account.</p>
  <p><a href="${escapeHtml(teamUrl)}" style="color: #171717;">Open Team</a></p>
  <p style="font-size: 12px; color: #737373;">If you didn’t expect this, contact your administrator.</p>
</body>
</html>`;
  await sendTransactionalEmail({ to: data.email, subject, html, text });
}
