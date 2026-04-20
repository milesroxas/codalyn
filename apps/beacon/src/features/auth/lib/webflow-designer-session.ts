import { getTowerAuthBaseUrl } from "@/features/auth/model/tower-auth-client";

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

/**
 * Webflow hybrid auth: Designer `getIdToken` → Tower resolves via Data API and issues a Better Auth session.
 * @see https://developers.webflow.com/designer/reference/get-user-id-token
 */
export async function exchangeWebflowDesignerSession(): Promise<{ ok: true } | { ok: false; error: string }> {
  const towerOrigin = getTowerAuthBaseUrl();
  if (!towerOrigin) {
    return { ok: false, error: "tower_not_configured" };
  }

  let idToken: string;
  try {
    idToken = await webflow.getIdToken();
  } catch {
    return { ok: false, error: "get_id_token_failed" };
  }

  const res = await fetch(`${towerOrigin}/api/auth/webflow-designer`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  let data: { token?: string; error?: string; hint?: string } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const msg = data.error ?? data.hint ?? `http_${res.status}`;
    return { ok: false, error: msg };
  }

  const token = typeof data.token === "string" ? data.token.trim() : "";
  if (!token) {
    return { ok: false, error: "no_session_token" };
  }

  writeBeaconTowerSessionToken(token);
  return { ok: true };
}
