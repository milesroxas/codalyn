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
  const subject = "You're approved for Tower early access";
  const text = [
    "Your early access request was approved.",
    "",
    `Create your account with ${data.email}:`,
    actionUrl,
    "",
    "If you didn't request this, you can ignore this email.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p>Your early access request was approved.</p>
  <p><a href="${escapeHtml(actionUrl)}" style="color: #171717;">Create your account</a></p>
  <p style="font-size: 14px; color: #525252;">Use <strong>${escapeHtml(data.email)}</strong> when signing up.</p>
  <p style="font-size: 12px; color: #737373;">If you didn't request this, you can ignore this email.</p>
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
    "Your early access request was approved.",
    "",
    `Sign in with ${data.email}:`,
    signInUrl,
    "",
    "If you didn't request this, contact your administrator.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p>Your early access request was approved.</p>
  <p><a href="${escapeHtml(signInUrl)}" style="color: #171717;">Sign in to Tower</a></p>
  <p style="font-size: 14px; color: #525252;">Use <strong>${escapeHtml(data.email)}</strong> when signing in.</p>
  <p style="font-size: 12px; color: #737373;">If you didn't request this, contact your administrator.</p>
</body>
</html>`;
  await sendTransactionalEmail({ to: data.email, subject, html, text });
}

/** Sign-up invite URL for early access approval (absolute, environment-aware). */
export function buildEarlyAccessSignUpUrl(inviteToken: string): string {
  return resolveTowerAbsoluteUrl(`/sign-up?invite=${encodeURIComponent(inviteToken)}`);
}
