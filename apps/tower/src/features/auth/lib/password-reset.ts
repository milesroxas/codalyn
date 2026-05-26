import { resolveTowerAppCallbackUrl } from "@/features/auth/lib/email-verification";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";

export const PASSWORD_RESET_QUERY = "passwordReset";

export const FORGOT_PASSWORD_COPY = {
  title: "Forgot password?",
  description: "Enter your Tower email and we’ll send a link to reset your password.",
  submitLabel: "Send reset link",
  submitPendingLabel: "Sending…",
} as const;

export const PASSWORD_RESET_CHECK_EMAIL_COPY = {
  title: "Check your email",
  description: "If an account exists for that address, we sent a password reset link.",
  resendLabel: "Resend reset link",
  resendPendingLabel: "Sending…",
  resendSuccess: "Reset link sent.",
  footerLabel: "Back to sign in",
} as const;

export const RESET_PASSWORD_COPY = {
  title: "Choose a new password",
  description: "Enter a new password for your Tower account.",
  submitLabel: "Update password",
  submitPendingLabel: "Updating…",
  successMessage: "Password updated. Sign in with your new password.",
  invalidTokenMessage: "This reset link is invalid or expired. Request a new one.",
  requestNewLinkLabel: "Request a new reset link",
} as const;

export function resolveTowerPasswordResetRedirectUrl(callbackPath = "/"): string {
  const safeCallbackPath = sanitizeRelativePath(callbackPath);
  const resetPageUrl = resolveTowerAppCallbackUrl("/reset-password");
  const url = new URL(resetPageUrl);
  url.searchParams.set("callbackUrl", safeCallbackPath);
  return url.toString();
}

export function readPasswordResetToken(searchParams: URLSearchParams): string | null {
  const token = searchParams.get("token")?.trim();
  return token || null;
}

export function isInvalidPasswordResetToken(searchParams: URLSearchParams): boolean {
  return searchParams.get("error") === "INVALID_TOKEN";
}

export function readPasswordResetSuccess(searchParams: URLSearchParams): boolean {
  return searchParams.get(PASSWORD_RESET_QUERY) === "1";
}
