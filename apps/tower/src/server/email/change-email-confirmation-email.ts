import { sendTransactionalEmail } from "@/server/email/resend-send";
import { resolveTowerAbsoluteUrl } from "@/server/tower-public-url";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Better Auth `user.changeEmail.sendChangeEmailConfirmation` — sent to the current email.
 */
export async function sendChangeEmailConfirmationEmail(data: {
  user: { email: string; name?: string | null };
  newEmail: string;
  url: string;
}): Promise<void> {
  const safeUrl = resolveTowerAbsoluteUrl(data.url);
  const subject = "Confirm your Tower email change";
  const text = [
    `You requested to change your Tower account email to ${data.newEmail}.`,
    "",
    "Approve this change by opening the link below:",
    safeUrl,
    "",
    "If you didn’t request this, secure your account and change your password.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p>You requested to change your Tower sign-in email to <strong>${escapeHtml(data.newEmail)}</strong>.</p>
  <p><a href="${escapeHtml(safeUrl)}" style="color: #171717;">Confirm email change</a></p>
  <p style="font-size: 12px; color: #737373;">If you didn’t request this, secure your account and change your password.</p>
</body>
</html>`;

  await sendTransactionalEmail({
    to: data.user.email,
    subject,
    html,
    text,
  });
}
