import { sendTransactionalEmail } from "@/server/email/resend-send";
import { earlyAccessRequestDisplayName } from "@/shared/lib/access/early-access-request-name";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function greetingLine(firstName: string | null, lastName: string | null): string {
  const displayName = earlyAccessRequestDisplayName({ firstName, lastName });
  return displayName ? `Hi ${displayName},` : "Hi,";
}

export async function sendFlintBetaGroupRequestConfirmationEmail(data: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}): Promise<void> {
  const greeting = greetingLine(data.firstName, data.lastName);
  const subject = "We received your Codalyn beta group request";
  const text = [
    greeting,
    "",
    "Thanks for requesting to join the Codalyn beta testing group.",
    "",
    `We received your request for ${data.email}. Our team reviews each request manually and will follow up by email when there is a spot.`,
    "",
    "If you didn't request to join the beta group, you can ignore this email.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p>${escapeHtml(greeting)}</p>
  <p>Thanks for requesting to join the <strong>Codalyn beta testing group</strong>.</p>
  <p>We received your request for <strong>${escapeHtml(data.email)}</strong>. Our team reviews each request manually and will follow up by email when there is a spot.</p>
  <p style="font-size: 12px; color: #737373;">If you didn't request to join the beta group, you can ignore this email.</p>
</body>
</html>`;

  await sendTransactionalEmail({ to: data.email, subject, html, text });
}
