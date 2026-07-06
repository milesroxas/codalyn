import { sendTransactionalEmail } from "@/server/email/resend-send";

export async function sendWorkspaceDeletedMemberNotificationEmail(input: {
  to: string;
  workspaceName: string;
  actorName: string | null;
  recoveryDays: number;
}): Promise<void> {
  const actorLabel = input.actorName?.trim() || "The workspace owner";
  const subject = `${input.workspaceName} was scheduled for deletion on Tower`;
  const text = [
    `${actorLabel} scheduled “${input.workspaceName}” for deletion on Tower.`,
    "",
    `Members lose access immediately. The workspace can be recovered within ${input.recoveryDays} days before permanent removal.`,
    "",
    "If you did not expect this, contact the workspace owner or Tower support.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p><strong>${escapeHtml(actorLabel)}</strong> scheduled <strong>${escapeHtml(input.workspaceName)}</strong> for deletion on Tower.</p>
  <p>Members lose access immediately. The workspace can be recovered within ${input.recoveryDays} days before permanent removal.</p>
  <p style="font-size: 12px; color: #737373;">If you did not expect this, contact the workspace owner or Tower support.</p>
</body>
</html>`;

  await sendTransactionalEmail({ to: input.to, subject, html, text });
}

export async function sendWorkspaceDeletionPreNoticeEmail(input: {
  to: string;
  workspaceName: string;
  actorName: string | null;
}): Promise<void> {
  const actorLabel = input.actorName?.trim() || "The workspace owner";
  const subject = `${input.workspaceName} deletion was initiated on Tower`;
  const text = [
    `${actorLabel} started deleting “${input.workspaceName}” on Tower.`,
    "",
    "Team billing will be canceled and members will lose access.",
    "",
    "If you did not expect this, contact the workspace owner immediately.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p><strong>${escapeHtml(actorLabel)}</strong> started deleting <strong>${escapeHtml(input.workspaceName)}</strong> on Tower.</p>
  <p>Team billing will be canceled and members will lose access.</p>
  <p style="font-size: 12px; color: #737373;">If you did not expect this, contact the workspace owner immediately.</p>
</body>
</html>`;

  await sendTransactionalEmail({ to: input.to, subject, html, text });
}

export async function sendWorkspacePurgedMemberNotificationEmail(input: {
  to: string;
  workspaceName: string;
  actorName: string | null;
}): Promise<void> {
  const actorLabel = input.actorName?.trim() || "The workspace owner";
  const subject = `${input.workspaceName} was permanently deleted on Tower`;
  const text = [
    `${actorLabel} permanently deleted “${input.workspaceName}” on Tower.`,
    "",
    "The workspace and its data cannot be recovered.",
    "",
    "If you did not expect this, contact the workspace owner or Tower support.",
  ].join("\n");
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #171717;">
  <p><strong>${escapeHtml(actorLabel)}</strong> permanently deleted <strong>${escapeHtml(input.workspaceName)}</strong> on Tower.</p>
  <p>The workspace and its data cannot be recovered.</p>
  <p style="font-size: 12px; color: #737373;">If you did not expect this, contact the workspace owner or Tower support.</p>
</body>
</html>`;

  await sendTransactionalEmail({ to: input.to, subject, html, text });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
