/**
 * Webflow OAuth callback classification.
 *
 * Every authorization request Tower starts carries a `state` it minted — the dashboard flow keeps it
 * in an httpOnly cookie, the Designer flow in a DB row bound to the user, workspace and Webflow
 * identity — and the registered Marketplace install URL is Tower's own `/api/integrations/webflow/authorize`,
 * so Marketplace installs mint a state too. A callback that arrives without one therefore never
 * belongs to a flow Tower started and is refused before any code exchange (Marketplace guidelines,
 * "OAuth": include a unique `state` on every authorization request and verify it before exchanging
 * the code). The former "Webflow-initiated install" branch, which exchanged a state-less code and
 * bound the resulting token to whichever admin session happened to be signed in, is gone
 * (auth review 2026-09-18): a forwarded callback URL could plant a third party's Webflow
 * authorization into the victim's workspace.
 *
 * @see https://developers.webflow.com/data/reference/oauth-app — callback carries `code` and, when the
 * request included it, `state`.
 */

export type WebflowOAuthCallbackRouteKind =
  | "oauth_error"
  | "missing_code"
  | "missing_state"
  | "tower_cookie_state"
  | "tower_db_state";

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
    return "missing_state";
  }
  const cookieExpected = query.cookieExpectedState?.trim() ?? "";
  if (cookieExpected && cookieExpected === state) {
    return "tower_cookie_state";
  }
  return "tower_db_state";
}
