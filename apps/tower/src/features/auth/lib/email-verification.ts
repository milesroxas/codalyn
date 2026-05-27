import { authClient } from "@/features/auth/model/auth-client";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";

export const TOWER_EMAIL_VERIFIED_QUERY = "emailVerified";

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
  invalidTokenMessage: "This verification link is invalid or expired.",
  signInLabel: "Back to sign in",
} as const;

export function resolveTowerEmailVerificationCallbackUrl(path = "/"): string {
  const safePath = sanitizeRelativePath(path);
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const url = new URL(safePath, base || "http://localhost");
  url.searchParams.set(TOWER_EMAIL_VERIFIED_QUERY, "1");
  if (base) {
    return `${url.pathname}${url.search}`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${url.pathname}${url.search}`;
  }
  return `${url.pathname}${url.search}`;
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

/** Absolute callback URL for Better Auth verification emails, with post-verify query flag. */
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
  return error || null;
}

export function readEmailVerificationToken(searchParams: URLSearchParams): string | null {
  const token = searchParams.get("token")?.trim();
  return token || null;
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
      const queryIndex = decoded.indexOf("?");
      if (queryIndex === -1) {
        return resolveTowerEmailVerificationCallbackUrl(decoded);
      }
      const path = decoded.slice(0, queryIndex);
      const merged = new URL(resolveTowerEmailVerificationCallbackUrl(path), "http://localhost");
      for (const [key, value] of new URLSearchParams(decoded.slice(queryIndex + 1))) {
        merged.searchParams.set(key, value);
      }
      return `${merged.pathname}${merged.search}`;
    }

    const target = new URL(decoded);
    if (typeof window !== "undefined" && target.origin === window.location.origin) {
      return `${target.pathname}${target.search}`;
    }
    const appBase = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    if (appBase && target.origin === new URL(appBase).origin) {
      return `${target.pathname}${target.search}`;
    }
  } catch {
    // fall through
  }

  return resolveTowerEmailVerificationCallbackUrl("/");
}
