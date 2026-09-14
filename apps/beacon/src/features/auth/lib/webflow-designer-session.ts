import { getTowerAuthBaseUrl } from "@/features/auth/model/tower-auth-client";
import { extensionFetch } from "@/shared/lib/extension-egress";
import { formatTowerReachabilityError } from "@/shared/lib/tower-reachability-error";
import { writeBeaconTowerSessionToken } from "./beacon-tower-session-token";

export * from "./beacon-tower-session-token";

/** When set, skip silent hybrid re-auth so explicit sign-out is not undone by `exchangeWebflowDesignerSession`. */
const BEACON_TOWER_SUPPRESS_DESIGNER_EXCHANGE_KEY = "codalyn:beacon-tower-suppress-designer-exchange";

export function readSuppressDesignerSessionExchange(): boolean {
  try {
    return localStorage.getItem(BEACON_TOWER_SUPPRESS_DESIGNER_EXCHANGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSuppressDesignerSessionExchange(suppress: boolean): void {
  try {
    if (suppress) {
      localStorage.setItem(BEACON_TOWER_SUPPRESS_DESIGNER_EXCHANGE_KEY, "1");
    } else {
      localStorage.removeItem(BEACON_TOWER_SUPPRESS_DESIGNER_EXCHANGE_KEY);
    }
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

  // The site this ID token was issued on. Tower uses it to resolve with the token of the workspace that
  // owns this site (never another tenant's). Best-effort: a missing site id only narrows Tower's options.
  let siteId: string | null = null;
  try {
    const info = await webflow.getSiteInfo();
    siteId = typeof info?.siteId === "string" && info.siteId.length > 0 ? info.siteId : null;
  } catch {
    siteId = null;
  }

  // Deliberately not `towerFetch`: the exchange establishes the session, so no (possibly stale)
  // bearer is attached. Same egress point, same Tower-origin policy.
  let res: Response;
  try {
    res = await extensionFetch(`${towerOrigin}/api/auth/webflow-designer`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ idToken, app: "beacon", ...(siteId ? { siteId } : {}) }),
    });
  } catch (error) {
    // Network/CORS failure reaching Tower's auth API (common on preview behind Deployment Protection).
    // Return a stable code so callers can act on it; keep the operator-facing detail in the console.
    console.warn(`[beacon/webflow-designer] ${formatTowerReachabilityError(error)}`);
    return { ok: false, error: "tower_unreachable" };
  }

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
