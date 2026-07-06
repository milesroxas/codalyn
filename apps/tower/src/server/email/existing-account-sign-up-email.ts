import { sendTransactionalEmail } from "@/server/email/resend-send";
import { resolveTowerAbsoluteUrl } from "@/server/tower-public-url";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Better Auth `emailAndPassword.onExistingUserSignUp` — sent when someone signs up with an email
 * that already has a Tower account. The sign-up response is a synthetic "check your email" success
 * (enumeration protection), so this email is the only way the existing account holder learns they
 * should sign in instead of waiting for a verification link that will never arrive.
 */
export async function sendExistingAccountSignUpEmail(data: {
  user: { email: string; name?: string | null };
}): Promise<void> {
  const signInUrl = resolveTowerAbsoluteUrl("/sign-in");
  const resetUrl = resolveTowerAbsoluteUrl("/forgot-password");
  const subject = "You already have a Tower account";
  const text = [
    "Someone (probably you) tried to create a Tower account with this email, but an account already exists.",
    "",
    "Sign in to your existing account:",
    signInUrl,
    "",
    "Forgot your password? Reset it here:",
    resetUrl,
    "",
    "If this wasn’t you, you can ignore this email — no account was created or changed.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p>Someone (probably you) tried to create a Tower account with this email, but an account already exists.</p>
  <p><a href="${escapeHtml(signInUrl)}" style="color: #171717;">Sign in to your existing account</a></p>
  <p>Forgot your password? <a href="${escapeHtml(resetUrl)}" style="color: #171717;">Reset it here</a>.</p>
  <p style="font-size: 12px; color: #737373;">If this wasn’t you, you can ignore this email — no account was created or changed.</p>
</body>
</html>`;

  await sendTransactionalEmail({
    to: data.user.email,
    subject,
    html,
    text,
  });
}
