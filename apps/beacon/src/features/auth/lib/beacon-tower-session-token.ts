/**
 * Better Auth session token (bearer plugin) for Tower — not the Webflow Data API OAuth access token.
 * Webflow OAuth tokens live only on Tower (Postgres `organization_webflow_oauth_token` after the code exchange).
 *
 * Held in memory only — never persisted to Web Storage (Webflow Marketplace token-storage guidance). On
 * reload the silent Designer exchange (`webflow.getIdToken()` → Tower) re-establishes the session, so
 * persistence buys nothing and would leave a long-lived bearer readable by any code in the extension
 * origin.
 *
 * This module touches no Web Storage at all — not even to delete. Internal builds before 2026-05-18
 * persisted the bearer under a storage key, and a one-time removal of that key shipped here until
 * review round 8 (2026-09-17): App Review Preflight's "External API Calls / third-party data egress"
 * evidence landed on that line — a storage call keyed by a session-token name — and no Marketplace
 * build ever wrote the key (the sessions those internal builds stored expired months ago), so the
 * cleanup protected nobody and advertised a credential in storage. The release build now forbids any
 * credential-named storage key (`staticForbiddenMarkers`, scripts/build-cli.mjs) and the source guard
 * in `extension-egress.test.ts` keeps this module free of every storage API.
 */
let beaconTowerSessionToken: string | undefined;

export function readBeaconTowerSessionToken(): string | undefined {
  return beaconTowerSessionToken;
}

export function writeBeaconTowerSessionToken(token: string): void {
  const t = token.trim();
  if (!t) {
    return;
  }
  beaconTowerSessionToken = t;
}

export function clearBeaconTowerSessionToken(): void {
  beaconTowerSessionToken = undefined;
}
