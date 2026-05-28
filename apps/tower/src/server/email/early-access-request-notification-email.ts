import { sendTransactionalEmail } from "@/server/email/resend-send";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { earlyAccessRequestDisplayName } from "@/shared/lib/access/early-access-request-name";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatOptionalField(label: string, value: string | null): string[] {
  if (!value) {
    return [];
  }
  return [`${label}: ${value}`, ""];
}

export async function sendEarlyAccessRequestNotificationEmail(data: {
  operatorEmails: string[];
  email: string;
  firstName: string | null;
  lastName: string | null;
  note: string | null;
  teamMemberEmails: string[] | null;
}): Promise<void> {
  const base = resolveTowerPublicBaseUrl();
  const consoleUrl = `${base}/console/access-requests`;
  const subject = `[Tower] New early access request: ${data.email}`;
  const displayName = earlyAccessRequestDisplayName(data);
  const teamMembers =
    data.teamMemberEmails && data.teamMemberEmails.length > 0 ? data.teamMemberEmails.join(", ") : null;
  const text = [
    "A new early access request was submitted in Tower.",
    "",
    `Email: ${data.email}`,
    ...formatOptionalField("Name", displayName),
    ...formatOptionalField("Referral", data.note),
    ...formatOptionalField("Team members", teamMembers),
    "",
    `Review in Operator: ${consoleUrl}`,
  ].join("\n");

  const detailLines = [
    `<strong>Email:</strong> ${escapeHtml(data.email)}`,
    displayName ? `<strong>Name:</strong> ${escapeHtml(displayName)}` : null,
    data.note ? `<strong>Referral:</strong> ${escapeHtml(data.note)}` : null,
    teamMembers ? `<strong>Team members:</strong> ${escapeHtml(teamMembers)}` : null,
  ]
    .filter(Boolean)
    .join("<br />");

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p>A new <strong>early access request</strong> was submitted in Tower.</p>
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
