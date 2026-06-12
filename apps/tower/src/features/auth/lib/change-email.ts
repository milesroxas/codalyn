import { resolveTowerAppCallbackUrl } from "@/features/auth/lib/email-verification";
import { TOWER_EMAIL_CHANGED_QUERY } from "@/shared/lib/auth/change-email-query";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";

export const CHANGE_EMAIL_ACCOUNT_COPY = {
  cardDescription:
    "For verified accounts we email your current address first, then your new address to confirm ownership.",
  submitSuccess:
    "Check your current email to approve this change. After that, open the link we send to your new address to finish.",
  pending: {
    title: "Confirm from your inbox",
    description:
      "We sent approval links to finish this change. Open the link in your current inbox first, then the one we send to your new address.",
    currentEmailLabel: "Current email",
    newEmailLabel: "New email",
    resendLabel: "Resend confirmation emails",
    resendPendingLabel: "Sending…",
    resendSuccess: "Confirmation emails sent again.",
    useDifferentEmailLabel: "Use a different email",
    cancelLabel: "Cancel email change",
    cancelDialogTitle: "Cancel this email change?",
    cancelDialogDescription:
      "Tower will stop showing this request. Links already sent to your inbox may still work until they expire — ignore them if you changed your mind.",
    cancelConfirmLabel: "Cancel email change",
    cancelDismissLabel: "Keep waiting",
    cancelSuccess: "Email change canceled. Your sign-in email stays the same.",
  },
  changedToast: {
    title: "Email updated",
    description: "Your Tower sign-in email has been changed.",
  },
} as const;

export function readEmailChangeSuccess(searchParams: URLSearchParams): boolean {
  return searchParams.get(TOWER_EMAIL_CHANGED_QUERY) === "1";
}

export function resolveTowerEmailChangePendingAppCallbackUrl(path = "/account"): string {
  return resolveTowerAppCallbackUrl(sanitizeRelativePath(path));
}
