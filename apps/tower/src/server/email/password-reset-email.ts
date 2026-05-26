import { sendTransactionalEmail } from "@/server/email/resend-send";
import { resolveTowerAbsoluteUrl } from "@/server/tower-public-url";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Better Auth `emailAndPassword.sendResetPassword` — password recovery link.
 */
export async function sendPasswordResetEmail(data: {
  user: { email: string; name?: string | null };
  url: string;
}): Promise<void> {
  const resetUrl = resolveTowerAbsoluteUrl(data.url);
  const subject = "Reset your Tower password";
  const text = [
    "Open the link below to reset your Tower password:",
    resetUrl,
    "",
    "If you didn’t request this, you can ignore this email.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p>Open the link below to reset your Tower password.</p>
  <p><a href="${escapeHtml(resetUrl)}" style="color: #171717;">Reset password</a></p>
  <p style="font-size: 12px; color: #737373;">If you didn’t request this, you can ignore this email.</p>
</body>
</html>`;

  await sendTransactionalEmail({
    to: data.user.email,
    subject,
    html,
    text,
  });
}
