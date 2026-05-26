import { sendTransactionalEmail } from "@/server/email/resend-send";
import { resolveTowerAbsoluteUrl } from "@/server/tower-public-url";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Better Auth change-email step 2 — sent to the new email after current-email approval.
 */
export async function sendChangeEmailNewAddressVerificationEmail(data: {
  user: { email: string; name?: string | null };
  url: string;
}): Promise<void> {
  const verifyUrl = resolveTowerAbsoluteUrl(data.url);
  const subject = "Confirm your new Tower email";
  const text = [
    "Open the link below to confirm your new Tower sign-in email:",
    verifyUrl,
    "",
    "If you didn’t request this change, secure your account and contact support.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p>Confirm your new Tower sign-in email address.</p>
  <p><a href="${escapeHtml(verifyUrl)}" style="color: #171717;">Confirm new email</a></p>
  <p style="font-size: 12px; color: #737373;">If you didn’t request this change, secure your account and contact support.</p>
</body>
</html>`;

  await sendTransactionalEmail({
    to: data.user.email,
    subject,
    html,
    text,
  });
}
