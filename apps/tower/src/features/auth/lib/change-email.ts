import { resolveTowerAppCallbackUrl } from "@/features/auth/lib/email-verification";
import { TOWER_EMAIL_CHANGED_QUERY } from "@/shared/lib/auth/change-email-query";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";

export { TOWER_EMAIL_CHANGED_QUERY };

export const CHANGE_EMAIL_ACCOUNT_COPY = {
  cardDescription:
    "For verified accounts we email your current address first, then your new address to confirm ownership.",
  submitSuccess:
    "Check your current email to approve this change. After that, open the link we send to your new address to finish.",
  changedToast: {
    title: "Email updated",
    description: "Your Tower sign-in email has been changed.",
  },
} as const;

export function readEmailChangeSuccess(searchParams: URLSearchParams): boolean {
  return searchParams.get(TOWER_EMAIL_CHANGED_QUERY) === "1";
}

export function resolveTowerEmailChangeCompleteCallbackUrl(path = "/account"): string {
  const safePath = sanitizeRelativePath(path);
  const url = new URL(safePath, "http://localhost");
  url.searchParams.set(TOWER_EMAIL_CHANGED_QUERY, "1");
  return `${url.pathname}${url.search}`;
}

export function resolveTowerEmailChangePendingAppCallbackUrl(path = "/account"): string {
  return resolveTowerAppCallbackUrl(sanitizeRelativePath(path));
}
