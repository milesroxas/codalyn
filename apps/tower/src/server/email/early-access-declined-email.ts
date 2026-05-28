import { sendTransactionalEmail } from "@/server/email/resend-send";
import { earlyAccessRequestDisplayName } from "@/shared/lib/access/early-access-request-name";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function greetingLine(firstName: string | null, lastName: string | null): string {
  const displayName = earlyAccessRequestDisplayName({ firstName, lastName });
  return displayName ? `Hi ${displayName},` : "Hi,";
}

/**
 * Early access request declined — notification sent to the requester with the operator's reason.
 */
export async function sendEarlyAccessDeclinedEmail(data: {
  email: string;
  firstName: string | null;
  lastName: string | null;
  declineReason: string;
}): Promise<void> {
  const greeting = greetingLine(data.firstName, data.lastName);
  const reason = data.declineReason.trim();
  const subject = "Update on your Tower access request";
  const text = [
    greeting,
    "",
    "Thank you for your interest in Codalyn Tower.",
    "",
    "After reviewing your request, we're unable to grant early access at this time.",
    "",
    "Reason:",
    reason,
    "",
    "If you believe this was a mistake, reply to this email.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p>${escapeHtml(greeting)}</p>
  <p>Thank you for your interest in <strong>Codalyn Tower</strong>.</p>
  <p>After reviewing your request, we're unable to grant early access at this time.</p>
  <p style="margin-bottom: 8px;"><strong>Reason</strong></p>
  <p style="margin-top: 0; padding: 12px 16px; border-radius: 8px; background: #f5f5f5; white-space: pre-wrap;">${escapeHtml(reason)}</p>
  <p style="font-size: 12px; color: #737373;">If you believe this was a mistake, reply to this email.</p>
</body>
</html>`;

  await sendTransactionalEmail({ to: data.email, subject, html, text });
}
