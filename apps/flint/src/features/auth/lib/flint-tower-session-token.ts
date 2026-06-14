/**
 * Better Auth session token (bearer plugin) for Tower — not a Webflow Data API
 * OAuth token. Namespaced separately from Beacon's token so the two extensions
 * never read each other's session.
 */
const FLINT_TOWER_SESSION_TOKEN_KEY = "codalyn:flint-tower-session-token";

export function readFlintTowerSessionToken(): string | undefined {
  try {
    return localStorage.getItem(FLINT_TOWER_SESSION_TOKEN_KEY)?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function writeFlintTowerSessionToken(token: string): void {
  const t = token.trim();
  if (!t) {
    return;
  }
  try {
    localStorage.setItem(FLINT_TOWER_SESSION_TOKEN_KEY, t);
  } catch {
    /* ignore */
  }
}

export function clearFlintTowerSessionToken(): void {
  try {
    localStorage.removeItem(FLINT_TOWER_SESSION_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
