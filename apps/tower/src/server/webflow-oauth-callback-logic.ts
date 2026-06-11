/**
 * Webflow OAuth callback classification.
 * @see https://developers.webflow.com/data/v2.0.0/reference/oauth-app — callback includes `code`; `state` is optional.
 */

import { WEBFLOW_OAUTH_AUTHORIZATION_CODE_TTL_MS } from "@/server/webflow-oauth-config";

export type WebflowOAuthCallbackRouteKind =
  | "oauth_error"
  | "missing_code"
  | "tower_cookie_state"
  | "tower_db_state"
  | "webflow_initiated_install";

export type WebflowOAuthCallbackQuery = {
  code: string | null;
  state: string | null;
  oauthError: string | null;
  oauthErrorDescription: string | null;
  cookieExpectedState: string | undefined;
};

export function classifyWebflowOAuthCallback(query: WebflowOAuthCallbackQuery): WebflowOAuthCallbackRouteKind {
  if (query.oauthError) {
    return "oauth_error";
  }
  if (!query.code) {
    return "missing_code";
  }
  const state = query.state?.trim() ?? "";
  if (!state) {
    return "webflow_initiated_install";
  }
  const cookieExpected = query.cookieExpectedState?.trim() ?? "";
  if (cookieExpected && cookieExpected === state) {
    return "tower_cookie_state";
  }
  return "tower_db_state";
}

export function isWebflowOAuthAuthorizationCodeExpired(createdAt: Date, nowMs: number = Date.now()): boolean {
  const ageMs = nowMs - createdAt.getTime();
  return ageMs < 0 || ageMs > WEBFLOW_OAUTH_AUTHORIZATION_CODE_TTL_MS;
}
