import {
  operatorInviteLinkExpiryHtmlBlock,
  operatorInviteLinkExpiryPlainTextLines,
} from "@/server/email/operator-invite-link-expiry-copy";
import { sendTransactionalEmail } from "@/server/email/resend-send";
import { resolveTowerAbsoluteUrl } from "@/server/tower-public-url";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Early access request approved — new user: sign-up link with operator invite token.
 */
export async function sendEarlyAccessApprovedNewUserEmail(data: { email: string; inviteUrl: string }): Promise<void> {
  const actionUrl = resolveTowerAbsoluteUrl(data.inviteUrl);
  const expiryLines = operatorInviteLinkExpiryPlainTextLines("early_access_approval");
  const subject = "You're approved for Tower early access";
  const text = [
    "Your early access request was approved. Use the link below to create your Tower account.",
    "",
    actionUrl,
    "",
    `Sign up with ${data.email}.`,
    ...expiryLines,
    "",
    "If you didn't request early access, you can ignore this email.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p>Your early access request was approved. Use the link below to create your Tower account.</p>
  <p><a href="${escapeHtml(actionUrl)}" style="color: #171717;">Create your account</a></p>
  <p style="font-size: 14px; color: #525252;">Sign up with <strong>${escapeHtml(data.email)}</strong>.</p>
  ${operatorInviteLinkExpiryHtmlBlock("early_access_approval")}
  <p style="font-size: 12px; color: #737373;">If you didn't request early access, you can ignore this email.</p>
</body>
</html>`;
  await sendTransactionalEmail({ to: data.email, subject, html, text });
}

/**
 * Early access request approved — existing user: sign-in link (access already granted on account).
 */
export async function sendEarlyAccessApprovedExistingUserEmail(data: { email: string }): Promise<void> {
  const signInUrl = resolveTowerAbsoluteUrl("/sign-in");
  const subject = "You're approved for Tower early access";
  const text = [
    "Your early access request was approved. Early access is already enabled on your account.",
    "",
    `Sign in with ${data.email}:`,
    signInUrl,
    "",
    "This sign-in link does not expire.",
    "",
    "If you didn't request early access, contact your administrator.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p>Your early access request was approved. Early access is already enabled on your account.</p>
  <p><a href="${escapeHtml(signInUrl)}" style="color: #171717;">Sign in to Tower</a></p>
  <p style="font-size: 14px; color: #525252;">Sign in with <strong>${escapeHtml(data.email)}</strong>.</p>
  <p style="font-size: 13px; color: #525252;">This sign-in link does not expire.</p>
  <p style="font-size: 12px; color: #737373;">If you didn't request early access, contact your administrator.</p>
</body>
</html>`;
  await sendTransactionalEmail({ to: data.email, subject, html, text });
}

/** Sign-up invite URL for early access approval (absolute, environment-aware). */
export function buildEarlyAccessSignUpUrl(inviteToken: string): string {
  return resolveTowerAbsoluteUrl(`/sign-up?invite=${encodeURIComponent(inviteToken)}`);
}
