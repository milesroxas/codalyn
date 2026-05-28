import { sendTransactionalEmail } from "@/server/email/resend-send";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";

export async function sendWorkspaceOwnershipTransferEmail(input: {
  to: string;
  workspaceName: string;
  fromUserName: string | null;
  transferId: string;
  requiresBillingAcceptance: boolean;
}): Promise<void> {
  const base = resolveTowerPublicBaseUrl();
  const acceptUrl = `${base}/team?ownershipTransferId=${encodeURIComponent(input.transferId)}`;
  const fromLabel = input.fromUserName?.trim() || "The workspace owner";
  const billingNote = input.requiresBillingAcceptance
    ? " This workspace has Team billing, so you must complete billing setup before the transfer completes."
    : "";
  const subject = `Accept ownership of ${input.workspaceName} on Tower`;
  const text = [
    `${fromLabel} wants to transfer ownership of “${input.workspaceName}” to you.${billingNote}`,
    "",
    "Review and accept the transfer in Team settings:",
    acceptUrl,
    "",
    "If you did not expect this, you can decline the transfer.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p><strong>${escapeHtml(fromLabel)}</strong> wants to transfer ownership of <strong>${escapeHtml(input.workspaceName)}</strong> to you.${escapeHtml(billingNote)}</p>
  <p><a href="${escapeHtml(acceptUrl)}">Review ownership transfer</a></p>
  <p style="font-size: 12px; color: #737373;">If you did not expect this, you can decline the transfer.</p>
</body>
</html>`;

  await sendTransactionalEmail({ to: input.to, subject, html, text });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
