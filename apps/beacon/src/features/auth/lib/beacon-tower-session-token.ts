/**
 * Better Auth session token (bearer plugin) for Tower — not the Webflow Data API OAuth access token.
 * Webflow OAuth tokens live only on Tower (Postgres `organization_webflow_oauth_token` after the code exchange).
 */
const BEACON_TOWER_SESSION_TOKEN_KEY = "codalyn:beacon-tower-session-token";

export function readBeaconTowerSessionToken(): string | undefined {
  try {
    return localStorage.getItem(BEACON_TOWER_SESSION_TOKEN_KEY)?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function writeBeaconTowerSessionToken(token: string): void {
  const t = token.trim();
  if (!t) {
    return;
  }
  try {
    localStorage.setItem(BEACON_TOWER_SESSION_TOKEN_KEY, t);
  } catch {
    /* ignore */
  }
}

export function clearBeaconTowerSessionToken(): void {
  try {
    localStorage.removeItem(BEACON_TOWER_SESSION_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
