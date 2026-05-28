import { sendTransactionalEmail } from "@/server/email/resend-send";
import { EARLY_ACCESS_REQUEST_APPROVAL_FOLLOW_UP } from "@/shared/lib/access/early-access-copy";
import { earlyAccessRequestDisplayName } from "@/shared/lib/access/early-access-request-name";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function greetingLine(firstName: string | null, lastName: string | null): string {
  const displayName = earlyAccessRequestDisplayName({ firstName, lastName });
  return displayName ? `Hi ${displayName},` : "Hi,";
}

/**
 * Early access request submitted — confirmation sent to the requester.
 */
export async function sendEarlyAccessRequestConfirmationEmail(data: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}): Promise<void> {
  const greeting = greetingLine(data.firstName, data.lastName);
  const subject = "We received your Tower access request";
  const text = [
    greeting,
    "",
    "Thanks for requesting early access to Codalyn Tower.",
    "",
    `We received your request for ${data.email}. Our team reviews each request manually. ${EARLY_ACCESS_REQUEST_APPROVAL_FOLLOW_UP}`,
    "",
    "If you didn't request access to Tower, you can ignore this email.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p>${escapeHtml(greeting)}</p>
  <p>Thanks for requesting early access to <strong>Codalyn Tower</strong>.</p>
  <p>We received your request for <strong>${escapeHtml(data.email)}</strong>. Our team reviews each request manually. ${escapeHtml(EARLY_ACCESS_REQUEST_APPROVAL_FOLLOW_UP)}</p>
  <p style="font-size: 12px; color: #737373;">If you didn't request access to Tower, you can ignore this email.</p>
</body>
</html>`;

  await sendTransactionalEmail({ to: data.email, subject, html, text });
}
