/**
 * Better Auth session token (bearer plugin) for Tower — not a Webflow Data API
 * OAuth token. Namespaced separately from Beacon's token so the two extensions
 * never read each other's session.
 *
 * Held in memory only — never persisted to localStorage/sessionStorage (Webflow Marketplace
 * token-storage guidance). On reload the silent Designer exchange (`webflow.getIdToken()` → Tower)
 * re-establishes the session.
 */
let flintTowerSessionToken: string | undefined;

// One-time cleanup: earlier builds persisted the bearer under this key; remove any leftover copy.
try {
  localStorage.removeItem("codalyn:flint-tower-session-token");
} catch {
  /* ignore */
}

export function readFlintTowerSessionToken(): string | undefined {
  return flintTowerSessionToken;
}

export function writeFlintTowerSessionToken(token: string): void {
  const t = token.trim();
  if (!t) {
    return;
  }
  flintTowerSessionToken = t;
}

export function clearFlintTowerSessionToken(): void {
  flintTowerSessionToken = undefined;
}
