/**
 * Tower serves more than one Webflow app. Each Webflow app has exactly one Designer Extension
 * building block (Beacon, Flint, …), so each is a separate registered app with its own client
 * credentials and its own ID-token issuer. A Designer ID token can only be resolved with a Data
 * Client token belonging to the SAME app that issued it (Webflow rejects cross-app resolves with a
 * 400). This registry is the single place that maps an app key → that app's env-configured
 * credentials, resolve bearer, and OAuth behavior.
 *
 * Env naming: per-app prefixed vars (`WEBFLOW_BEACON_*`, `WEBFLOW_FLINT_*`). Beacon also accepts the
 * legacy un-prefixed `WEBFLOW_CLIENT_ID` / `WEBFLOW_CLIENT_SECRET` / `WEBFLOW_TOKEN_RESOLVE_BEARER`
 * for back-compat with older deploys.
 *
 * @see https://developers.webflow.com/data/v2.0.0-beta/reference/token/resolve
 */

export type WebflowAppKey = "beacon" | "flint";

/** Back-compat: an untagged sign-in (older Beacon builds) is treated as Beacon, the original app. */
export const DEFAULT_WEBFLOW_APP_KEY: WebflowAppKey = "beacon";

/**
 * The app whose Data Client backs Tower's "Connect Webflow" Data API flow (OAuth authorize +
 * token exchange + proxy). Beacon is the hybrid Data Client app; Flint is Designer-only and never
 * connects, so the OAuth Data API flow always uses Beacon's credentials.
 */
export const WEBFLOW_DATA_API_APP_KEY: WebflowAppKey = "beacon";

export function normalizeWebflowAppKey(raw: unknown): WebflowAppKey {
  return raw === "flint" ? "flint" : DEFAULT_WEBFLOW_APP_KEY;
}

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export type WebflowAppClientCredentials = { clientId?: string; clientSecret?: string };

/** OAuth app credentials (authorization-code flow) for an app, with Beacon legacy fallback. */
export function resolveWebflowAppClientCredentials(app: WebflowAppKey): WebflowAppClientCredentials {
  if (app === "flint") {
    return { clientId: env("WEBFLOW_FLINT_CLIENT_ID"), clientSecret: env("WEBFLOW_FLINT_CLIENT_SECRET") };
  }
  return {
    clientId: env("WEBFLOW_BEACON_CLIENT_ID") ?? env("WEBFLOW_CLIENT_ID"),
    clientSecret: env("WEBFLOW_BEACON_CLIENT_SECRET") ?? env("WEBFLOW_CLIENT_SECRET"),
  };
}

/**
 * Operator-owned Data Client access token (scope `authorized_user:read`) used to resolve this app's
 * Designer ID tokens, or undefined when not configured.
 */
export function resolveWebflowAppBearer(app: WebflowAppKey): string | undefined {
  if (app === "flint") {
    return env("WEBFLOW_FLINT_TOKEN_RESOLVE_BEARER");
  }
  return env("WEBFLOW_BEACON_TOKEN_RESOLVE_BEARER") ?? env("WEBFLOW_TOKEN_RESOLVE_BEARER") ?? env("WEBFLOW_API_TOKEN");
}

/**
 * Whether an app authorizes per-workspace OAuth Data API tokens. Beacon connects to the Data API
 * (CMS/assets), so its stored workspace tokens are valid resolve bearers for Beacon ID tokens.
 * Flint's linter is Designer-only — it never connects, so it relies solely on its operator bearer.
 */
export function webflowAppUsesStoredOAuthTokens(app: WebflowAppKey): boolean {
  return app === "beacon";
}
