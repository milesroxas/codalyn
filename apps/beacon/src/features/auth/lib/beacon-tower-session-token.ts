/**
 * Better Auth session token (bearer plugin) for Tower — not the Webflow Data API OAuth access token.
 * Webflow OAuth tokens live only on Tower (Postgres `organization_webflow_oauth_token` after the code exchange).
 *
 * Held in memory only — never persisted to localStorage/sessionStorage (Webflow Marketplace token-storage
 * guidance). On reload the silent Designer exchange (`webflow.getIdToken()` → Tower) re-establishes the
 * session, so persistence buys nothing and would leave a long-lived bearer readable by any code in the
 * extension origin.
 */
let beaconTowerSessionToken: string | undefined;

// One-time cleanup: earlier builds persisted the bearer under this key; remove any leftover copy.
try {
  localStorage.removeItem("codalyn:beacon-tower-session-token");
} catch {
  /* ignore */
}

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
