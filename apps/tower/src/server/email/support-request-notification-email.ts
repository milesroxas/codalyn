import { sendTransactionalEmail } from "@/server/email/resend-send";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import type { TowerSupportRequestKind } from "@/shared/lib/support/tower-support-request";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function kindLabel(kind: TowerSupportRequestKind): string {
  return kind === "feedback" ? "Feedback" : "Help request";
}

export async function sendSupportRequestNotificationEmail(data: {
  operatorEmails: string[];
  kind: TowerSupportRequestKind;
  topicLabel: string;
  details: string;
  email: string;
}): Promise<void> {
  const base = resolveTowerPublicBaseUrl();
  const consoleUrl = `${base}/console/support-requests`;
  const subject = `[Tower] New ${kindLabel(data.kind).toLowerCase()}: ${data.topicLabel}`;
  const text = [
    `A new ${kindLabel(data.kind).toLowerCase()} was submitted in Tower.`,
    "",
    `Kind: ${kindLabel(data.kind)}`,
    `Topic: ${data.topicLabel}`,
    `From: ${data.email}`,
    "",
    data.details,
    "",
    `Review in Operator: ${consoleUrl}`,
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p>A new <strong>${escapeHtml(kindLabel(data.kind).toLowerCase())}</strong> was submitted in Tower.</p>
  <p><strong>Topic:</strong> ${escapeHtml(data.topicLabel)}<br />
  <strong>From:</strong> ${escapeHtml(data.email)}</p>
  <pre style="white-space: pre-wrap; font-family: inherit; background: #f5f5f5; padding: 12px; border-radius: 8px;">${escapeHtml(data.details)}</pre>
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
