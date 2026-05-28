export type EarlyAccessRequestStatusFilter = "pending" | "approved" | "dismissed" | "all";

export const OPERATOR_ACCESS_REQUEST_APPROVE_LABEL = "Approve access";
export const OPERATOR_ACCESS_REQUEST_DECLINE_LABEL = "Decline";

export const OPERATOR_ACCESS_REQUEST_DECLINE_DIALOG_TITLE = "Decline access request?";
export const OPERATOR_ACCESS_REQUEST_DECLINE_DIALOG_DESCRIPTION =
  "The requester will receive an email with your reason. They will not receive access to Tower.";
export const OPERATOR_ACCESS_REQUEST_DECLINE_REASON_LABEL = "Reason for declining";
export const OPERATOR_ACCESS_REQUEST_DECLINE_REASON_PLACEHOLDER =
  "Explain why access cannot be granted. This message is included in the email to the requester.";
export const OPERATOR_ACCESS_REQUEST_DECLINE_REASON_REQUIRED = "Enter a reason before declining.";
export const OPERATOR_ACCESS_REQUEST_DECLINE_CONFIRM_LABEL = "Decline and send email";
export const OPERATOR_ACCESS_REQUEST_DECLINE_CANCEL_LABEL = "Cancel";

export const OPERATOR_ACCESS_REQUEST_APPROVE_SUCCESS_INVITE = "Access approved — invite email sent";
export const OPERATOR_ACCESS_REQUEST_APPROVE_SUCCESS_SIGN_IN = "Access approved — sign-in email sent";
export const OPERATOR_ACCESS_REQUEST_APPROVE_ERROR = "Could not approve access request";
export const OPERATOR_ACCESS_REQUEST_DECLINE_SUCCESS = "Access request declined — email sent";
export const OPERATOR_ACCESS_REQUEST_DECLINE_ERROR = "Could not decline access request";

export const OPERATOR_ACCESS_REQUEST_LOAD_ERROR = "Could not load access requests";

export const OPERATOR_ACCESS_REQUEST_RESEND_LABEL = "Resend email";
export const OPERATOR_ACCESS_REQUEST_COPY_LINK_LABEL = "Copy link";
export const OPERATOR_ACCESS_REQUEST_RESEND_SUCCESS = "Approval email sent";
export const OPERATOR_ACCESS_REQUEST_RESEND_ERROR = "Could not resend approval email";
export const OPERATOR_ACCESS_REQUEST_COPY_LINK_SUCCESS = "Link copied";
export const OPERATOR_ACCESS_REQUEST_COPY_LINK_ERROR = "Could not copy approval link";

export function earlyAccessRequestApprovalUrl(result: { inviteUrl?: string; signInUrl?: string }): string | null {
  return result.inviteUrl ?? result.signInUrl ?? null;
}

export function earlyAccessRequestStatusLabel(status: string): string {
  if (status === "approved") {
    return "Approved";
  }
  if (status === "dismissed") {
    return "Declined";
  }
  if (status === "pending") {
    return "Pending";
  }
  return status;
}

export function earlyAccessRequestEmptyMessage(filter: EarlyAccessRequestStatusFilter): string {
  if (filter === "pending") {
    return "No pending requests.";
  }
  if (filter === "approved") {
    return "No approved requests.";
  }
  if (filter === "dismissed") {
    return "No declined requests.";
  }
  return "No access requests match this filter.";
}
