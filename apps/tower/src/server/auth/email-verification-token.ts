import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";

export const TOWER_EMAIL_VERIFICATION_PAGE_PATH = "/verify-email";

/**
 * Decode Better Auth email verification JWT payload for routing only.
 * Authorization still happens in Better Auth's verify-email handler.
 */
export function readEmailVerificationTokenPayload(token: string): {
  email: string | null;
  updateTo: string | null;
  requestType: string | null;
} {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { email: null, updateTo: null, requestType: null };
  }
  try {
    const json = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      email?: unknown;
      updateTo?: unknown;
      requestType?: unknown;
    };
    return {
      email: typeof json.email === "string" ? json.email : null,
      updateTo: typeof json.updateTo === "string" ? json.updateTo : null,
      requestType: typeof json.requestType === "string" ? json.requestType : null,
    };
  } catch {
    return { email: null, updateTo: null, requestType: null };
  }
}

export function isChangeEmailVerificationRequest(token: string): boolean {
  return readEmailVerificationTokenPayload(token).requestType === "change-email-verification";
}

/** First-party verification page URL for transactional email (not `/api/auth/verify-email`). */
export function buildTowerEmailVerificationPageUrl(token: string, callbackUrl: string): string {
  const base = resolveTowerPublicBaseUrl().replace(/\/$/, "");
  const url = new URL(TOWER_EMAIL_VERIFICATION_PAGE_PATH, `${base}/`);
  url.searchParams.set("token", token);
  url.searchParams.set("callbackURL", callbackUrl);
  return url.toString();
}

/**
 * Rewrite Better Auth verification links to the Tower verification page.
 * Optionally override the post-verify callback encoded in the original link.
 */
export function rewriteBetterAuthVerifyEmailUrlToAppPage(authVerifyUrl: string, callbackUrlOverride?: string): string {
  const parsed = new URL(authVerifyUrl, "http://localhost");
  const token = parsed.searchParams.get("token")?.trim();
  if (!token) {
    return authVerifyUrl;
  }
  const callbackUrl = callbackUrlOverride ?? parsed.searchParams.get("callbackURL") ?? "/";
  return buildTowerEmailVerificationPageUrl(token, callbackUrl);
}

export function rewriteVerifyEmailCallbackUrl(verifyUrl: string, callbackUrl: string): string {
  return rewriteBetterAuthVerifyEmailUrlToAppPage(verifyUrl, callbackUrl);
}
