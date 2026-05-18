function trimTrailingSlash(input: string): string {
  return input.replace(/\/$/, "");
}

function resolveConfiguredAppUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.BETTER_AUTH_URL?.trim() || "").trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }
  return "http://localhost:3100";
}

/**
 * Canonical app origin used for OAuth redirects/pages.
 * Local/dev defaults to localhost:3100 when app URL env vars are unset.
 */
export function resolveWebflowOAuthAppUrl(): string {
  return resolveConfiguredAppUrl();
}

/**
 * Webflow OAuth callback URL used in authorize + token exchange.
 * When WEBFLOW_REDIRECT_URI is unset, derive from the app URL to avoid local env drift.
 */
export function resolveWebflowOAuthRedirectUri(): string {
  const explicit = process.env.WEBFLOW_REDIRECT_URI?.trim();
  if (explicit) {
    return explicit;
  }
  return `${resolveConfiguredAppUrl()}/api/integrations/webflow/callback`;
}

/** First-party dashboard OAuth: state + active workspace id (httpOnly). */
export const WEBFLOW_OAUTH_STATE_COOKIE = "wf_oauth_state";
export const WEBFLOW_OAUTH_ORG_COOKIE = "wf_oauth_org";

export const webflowOAuthPkceCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 600,
  path: "/",
};
