import { isChangeEmailVerificationRequest } from "@/server/auth/email-verification-token";
import { TOWER_EMAIL_CHANGED_QUERY } from "@/shared/lib/auth/change-email-query";

/**
 * Whether Better Auth's /verify-email after hook should set the email-verified flash cookie.
 * Skips change-email verification and failed redirects (Better Auth appends ?error=…).
 */
export function shouldSetTowerEmailVerifiedFlashAfterVerifyEmail(input: {
  path: string;
  token: string | null | undefined;
  redirectLocation: string | null | undefined;
}): boolean {
  if (input.path !== "/verify-email") {
    return false;
  }
  const token = input.token?.trim();
  if (token && isChangeEmailVerificationRequest(token)) {
    return false;
  }
  const location = input.redirectLocation?.trim();
  if (!location) {
    return false;
  }
  try {
    const redirectUrl = new URL(location, "http://localhost");
    if (redirectUrl.searchParams.has("error")) {
      return false;
    }
    if (redirectUrl.searchParams.get(TOWER_EMAIL_CHANGED_QUERY) === "1") {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}
