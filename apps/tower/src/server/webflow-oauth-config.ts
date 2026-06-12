import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";

/**
 * Canonical app origin used for OAuth redirects/pages.
 * Matches Better Auth `baseURL` (custom domain in production, localhost in dev).
 */
export function resolveWebflowOAuthAppUrl(): string {
  return resolveTowerPublicBaseUrl();
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
  return `${resolveTowerPublicBaseUrl()}/api/integrations/webflow/callback`;
}

/** First-party dashboard OAuth: state + active workspace id (httpOnly). */
export const WEBFLOW_OAUTH_STATE_COOKIE = "wf_oauth_state";
export const WEBFLOW_OAUTH_ORG_COOKIE = "wf_oauth_org";

/** Binds a browser to a staged Webflow-initiated install authorization code (httpOnly). */
export const WEBFLOW_OAUTH_INSTALL_PENDING_COOKIE = "wf_oauth_install_pending";

/**
 * Webflow authorization codes expire after 15 minutes.
 * @see https://developers.webflow.com/data/v2.0.0/reference/oauth-app
 */
export const WEBFLOW_OAUTH_AUTHORIZATION_CODE_TTL_MS = 15 * 60 * 1000;

export const WEBFLOW_OAUTH_FINISH_PATH = "/api/integrations/webflow/finish";

export const webflowOAuthPkceCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 600,
  path: "/",
};

export const webflowOAuthInstallPendingCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: Math.floor(WEBFLOW_OAUTH_AUTHORIZATION_CODE_TTL_MS / 1000),
  path: "/",
};
