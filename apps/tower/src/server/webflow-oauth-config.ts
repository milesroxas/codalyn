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

export const webflowOAuthPkceCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 600,
  path: "/",
};
