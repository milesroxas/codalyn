/**
 * Better Auth session token (bearer plugin) for Tower — not the Webflow Data API OAuth access token.
 * Webflow OAuth tokens live only on Tower (Postgres `webflow_oauth_token` after the code exchange).
 */
export const BEACON_TOWER_SESSION_TOKEN_KEY = "codalyn:beacon-tower-session-token";

export function readBeaconTowerSessionToken(): string | undefined {
  try {
    const fromLocal = localStorage.getItem(BEACON_TOWER_SESSION_TOKEN_KEY)?.trim();
    if (fromLocal) {
      return fromLocal;
    }
    const legacy = sessionStorage.getItem(BEACON_TOWER_SESSION_TOKEN_KEY)?.trim();
    if (legacy) {
      localStorage.setItem(BEACON_TOWER_SESSION_TOKEN_KEY, legacy);
      sessionStorage.removeItem(BEACON_TOWER_SESSION_TOKEN_KEY);
      return legacy;
    }
    return undefined;
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
    sessionStorage.removeItem(BEACON_TOWER_SESSION_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function clearBeaconTowerSessionToken(): void {
  try {
    localStorage.removeItem(BEACON_TOWER_SESSION_TOKEN_KEY);
    sessionStorage.removeItem(BEACON_TOWER_SESSION_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
