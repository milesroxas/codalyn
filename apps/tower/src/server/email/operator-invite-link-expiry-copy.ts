import { OPERATOR_CUSTOMER_INVITE_TTL_MS } from "@/server/operator-customer-invite-token";

/** Matches `OPERATOR_CUSTOMER_INVITE_TTL_MS` — keep invite emails in sync with token verification. */
export const OPERATOR_INVITE_LINK_VALID_DAYS = Math.round(OPERATOR_CUSTOMER_INVITE_TTL_MS / (24 * 60 * 60 * 1000));

export type OperatorInviteLinkExpiryContext = "early_access_approval" | "operator_invite";

function operatorInviteLinkExpiredHelp(context: OperatorInviteLinkExpiryContext): string {
  if (context === "early_access_approval") {
    return "If the link has expired, contact support@codalyn.app for a new approval link.";
  }
  return "If the link has expired, ask the person who invited you to send a new invite.";
}

/** Plain-text lines placed after the sign-up URL in invite emails. */
export function operatorInviteLinkExpiryPlainTextLines(context: OperatorInviteLinkExpiryContext): string[] {
  return [
    `This sign-up link expires in ${OPERATOR_INVITE_LINK_VALID_DAYS} days.`,
    operatorInviteLinkExpiredHelp(context),
  ];
}

/** HTML block placed after the primary CTA in invite emails. */
export function operatorInviteLinkExpiryHtmlBlock(context: OperatorInviteLinkExpiryContext): string {
  const help = operatorInviteLinkExpiredHelp(context);
  return `<p style="font-size: 13px; color: #525252;">This sign-up link expires in <strong>${OPERATOR_INVITE_LINK_VALID_DAYS} days</strong>. ${help}</p>`;
}
