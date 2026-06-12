import { sendTransactionalEmail } from "@/server/email/resend-send";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { earlyAccessRequestDisplayName } from "@/shared/lib/access/early-access-request-name";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendFlintBetaGroupRequestNotificationEmail(data: {
  operatorEmails: string[];
  email: string;
  firstName: string | null;
  lastName: string | null;
}): Promise<void> {
  const base = resolveTowerPublicBaseUrl();
  const consoleUrl = `${base}/console/flint-requests`;
  const subject = `[Flint] New beta group request: ${data.email}`;
  const displayName = earlyAccessRequestDisplayName(data);
  const text = [
    "A new Flint beta group request was submitted from the marketing page.",
    "",
    `Email: ${data.email}`,
    ...(displayName ? [`Name: ${displayName}`, ""] : []),
    "",
    `Review in Operator: ${consoleUrl}`,
  ].join("\n");

  const detailLines = [
    `<strong>Email:</strong> ${escapeHtml(data.email)}`,
    displayName ? `<strong>Name:</strong> ${escapeHtml(displayName)}` : null,
  ]
    .filter(Boolean)
    .join("<br />");

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p>A new <strong>Flint beta group request</strong> was submitted from the marketing page.</p>
  <p>${detailLines}</p>
  <p><a href="${escapeHtml(consoleUrl)}" style="color: #171717;">Open in Operator</a></p>
</body>
</html>`;

  await Promise.all(
    data.operatorEmails.map((to) =>
      sendTransactionalEmail({
        to,
        subject,
        html,
        text,
      })
    )
  );
}
