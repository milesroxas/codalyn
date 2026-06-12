import { authClient } from "@/features/auth/model/auth-client";
import type { AuthCheckEmailCardCopy } from "@/features/auth/ui/auth-check-email-card";
import {
  isEmailVerificationRedirectError,
  resolveTowerEmailVerificationCallbackPath,
  stripLegacyEmailVerifiedQueryParam,
  TOWER_EMAIL_VERIFIED_QUERY,
} from "@/shared/lib/auth/tower-email-verification-callback";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";

export { TOWER_EMAIL_VERIFIED_QUERY };

export const EMAIL_VERIFICATION_BANNER_COPY = {
  title: "Verify your email",
  description:
    "Confirm your email address to secure your Tower account. Check your inbox for a verification link, or resend it below.",
} as const;

export const CHECK_EMAIL_PROMPT_COPY = {
  title: "Check your email",
  description: "We sent a verification link to your inbox. Open it to finish signing in to Tower.",
  resendLabel: "Resend verification email",
  resendPendingLabel: "Sending…",
  resendSuccess: "Verification email sent.",
  signInLabel: "Back to sign in",
} as const;

export type EmailVerificationPromptContext = "signIn" | "signUp" | "teamInvite";

export function resolveCheckEmailPromptCopy(context: EmailVerificationPromptContext): AuthCheckEmailCardCopy {
  switch (context) {
    case "signUp":
      return {
        ...CHECK_EMAIL_PROMPT_COPY,
        description: "We sent a verification link to your inbox. Open it to finish creating your Tower account.",
        footerLabel: "Back to sign up",
      };
    case "teamInvite":
      return {
        ...CHECK_EMAIL_PROMPT_COPY,
        title: "Verify your email to join",
        description:
          "We sent a verification link to your inbox. Open it to confirm your address, then you'll join the workspace automatically.",
        footerLabel: "Back to invitation",
      };
    default:
      return {
        ...CHECK_EMAIL_PROMPT_COPY,
        footerLabel: CHECK_EMAIL_PROMPT_COPY.signInLabel,
      };
  }
}

export const EMAIL_VERIFIED_TOAST = {
  title: "Email verified",
  description: "Your Tower email address is confirmed.",
} as const;

export const EMAIL_VERIFICATION_FAILED_TOAST = {
  title: "Email verification failed",
  description: "This link is invalid or expired. Resend a verification email below.",
} as const;

export const VERIFY_EMAIL_PAGE_COPY = {
  pendingTitle: "Verifying your email",
  pendingDescription: "Hang tight while we confirm your address.",
  invalidTokenTitle: "Verification link expired",
  invalidTokenMessage: "This verification link is invalid or expired. Request a new one from the sign-in page.",
  signInLabel: "Back to sign in",
} as const;

/** Same-origin post-verify destination — no flash query params (flash uses an httpOnly cookie). */
export function resolveTowerEmailVerificationCallbackUrl(path = "/"): string {
  return resolveTowerEmailVerificationCallbackPath(path);
}

export function resolveTowerAppCallbackUrl(path: string): string {
  const safePath = sanitizeRelativePath(path);
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (base) {
    return `${base}${safePath}`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${safePath}`;
  }
  return safePath;
}

/** Absolute callback URL for Better Auth verification emails. */
export function resolveTowerEmailVerificationAppCallbackUrl(callbackPath = "/"): string {
  return resolveTowerAppCallbackUrl(resolveTowerEmailVerificationCallbackUrl(callbackPath));
}

export async function sendTowerVerificationEmail(email: string, callbackPath = "/"): Promise<{ error: string | null }> {
  const { error } = await authClient.sendVerificationEmail({
    email,
    callbackURL: resolveTowerEmailVerificationAppCallbackUrl(callbackPath),
    fetchOptions: { credentials: "include" },
  });
  return { error: error?.message ?? null };
}

export function isEmailNotVerifiedAuthError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) {
    return false;
  }
  if (error.code === "EMAIL_NOT_VERIFIED") {
    return true;
  }
  return error.message?.toLowerCase().includes("email not verified") ?? false;
}

export function readSessionEmailVerified(user: { emailVerified?: boolean | null } | null | undefined): boolean {
  return Boolean(user?.emailVerified);
}

export function readEmailVerificationRedirectError(searchParams: URLSearchParams): string | null {
  const error = searchParams.get("error")?.trim();
  if (!error || !isEmailVerificationRedirectError(error)) {
    return null;
  }
  return error;
}

export function readEmailVerificationToken(searchParams: URLSearchParams): string | null {
  const token = searchParams.get("token")?.trim();
  return token || null;
}

/** Better Auth GET endpoint — verifies token, sets session, redirects to callbackURL. */
export function buildTowerVerifyEmailApiUrl(token: string, callbackPath: string, origin = "http://localhost"): string {
  const apiUrl = new URL("/api/auth/verify-email", origin);
  apiUrl.searchParams.set("token", token);
  apiUrl.searchParams.set("callbackURL", resolveTowerEmailVerificationAppCallbackUrl(callbackPath));
  return apiUrl.toString();
}

/** Same-origin post-verify destination from the verification page query string. */
export function readEmailVerificationCallbackUrl(searchParams: URLSearchParams): string {
  const raw = searchParams.get("callbackURL")?.trim();
  if (!raw) {
    return resolveTowerEmailVerificationCallbackUrl("/");
  }

  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith("/")) {
      return resolveTowerEmailVerificationCallbackUrl(decoded);
    }

    const target = new URL(decoded);
    if (typeof window !== "undefined" && target.origin === window.location.origin) {
      return resolveTowerEmailVerificationCallbackUrl(`${target.pathname}${target.search}`);
    }
    const appBase = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    if (appBase && target.origin === new URL(appBase).origin) {
      return resolveTowerEmailVerificationCallbackUrl(`${target.pathname}${target.search}`);
    }
  } catch {
    // fall through
  }

  return resolveTowerEmailVerificationCallbackUrl("/");
}

export { stripLegacyEmailVerifiedQueryParam };
