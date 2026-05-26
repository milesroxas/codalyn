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

export function resolveTowerEmailVerificationCallbackUrl(path = "/"): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, base || "http://localhost");
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
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (base) {
    return `${base}${normalizedPath}`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalizedPath}`;
  }
  return normalizedPath;
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
