import { createAuthClient } from "better-auth/react";
import { readBeaconTowerSessionToken } from "@/features/auth/lib/beacon-tower-session-token";
import { isTrustedRedirectUrl } from "@/features/auth/lib/trusted-redirect";
import { isBeaconTowerOriginConfigured, readBeaconTowerOrigin } from "@/shared/lib/beacon-tower-origin";
import { towerFetch } from "@/shared/lib/tower-client";

const baseURL = readBeaconTowerOrigin();

/** Entry route for opening Tower from Beacon (host-split app host, not marketing `/`). */
export const TOWER_APP_ENTRY_PATH = "/auth/continue";

/**
 * Replaces Better Auth's default redirect fetch plugin (disabled below), which assigns
 * `window.location.href` to any `data.url` the server marks `redirect: true` — flagged in
 * Marketplace review as an unvalidated server-driven redirect. This variant honors the redirect
 * only for allowlisted destinations: the Tower origin this bundle was built against and Webflow's
 * OAuth consent screen. No Beacon flow currently returns `redirect: true`; the plugin exists so
 * any future one is origin-constrained by construction.
 */
const allowlistedRedirectPlugin = {
  id: "beacon-allowlisted-redirect",
  name: "Beacon Allowlisted Redirect",
  hooks: {
    onSuccess(context: { data?: { url?: unknown; redirect?: unknown } | null }) {
      const data = context.data;
      if (!data?.redirect || typeof data.url !== "string") {
        return;
      }
      if (!isTrustedRedirectUrl(data.url, baseURL)) {
        return;
      }
      window.location.href = data.url;
    },
  },
};

/** Valid URL required by the client; session hooks only run when Tower is configured in the UI. */
export const towerAuthClient = createAuthClient({
  baseURL: baseURL || "https://beacon.tower.invalid",
  // Drops the built-in redirect plugin (unvalidated `window.location.href = data.url`);
  // `allowlistedRedirectPlugin` above is its origin-checked replacement.
  disableDefaultFetchPlugins: true,
  fetchOptions: {
    plugins: [allowlistedRedirectPlugin],
    onRequest(context) {
      const t = readBeaconTowerSessionToken();
      if (t) {
        context.headers.set("Authorization", `Bearer ${t}`);
      }
    },
    // The stored token is cleared by `clearStoredSession` after sign-out resolves, guarded by the
    // sign-out coordination epoch so a sign-in that lands mid-sign-out is not clobbered.
  },
});

export function getTowerAuthBaseUrl(): string {
  return baseURL;
}

export function isTowerConfigured(): boolean {
  return isBeaconTowerOriginConfigured();
}

export function buildTowerAppUrl(path: string): string | null {
  if (!baseURL) {
    return null;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseURL}${normalizedPath}`;
}

export function buildTowerAuthPopupUrl(path: "/sign-in" | "/sign-up", beaconOrigin: string): string | null {
  if (!baseURL) {
    return null;
  }
  return `${baseURL}${path}?beaconOrigin=${encodeURIComponent(beaconOrigin)}`;
}

/** Sized popup window (not a full browser tab) for focused Tower flows like sign-in and connect. */
const TOWER_POPUP_WINDOW_FEATURES = "popup=yes,width=520,height=760,scrollbars=yes,resizable=yes";

/** Mints a single-use Tower handoff token for the current Designer session, or null on failure. */
async function mintTowerHandoffToken(): Promise<string | null> {
  try {
    const res = await towerFetch("/api/auth/one-time-token/generate");
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { token?: unknown };
    const token = typeof data.token === "string" ? data.token.trim() : "";
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Opens a Tower app route in a new browser tab.
 *
 * When the Designer session holds a Tower bearer token, the tab is routed through a single-use
 * one-time-token handoff (`/api/beacon-handoff`) so Tower establishes a first-party cookie session
 * instead of bouncing the user to sign-in. The window is opened synchronously to preserve the user
 * gesture for popup blockers, then redirected once the short-lived token is minted; any failure
 * falls back to the plain route, which enforces its own auth.
 */
type OpenTowerAppPathOptions = {
  /** Open a sized popup window instead of a full browser tab. */
  popup?: boolean;
  /**
   * Resolve the destination path lazily — e.g. to await the current Designer `siteId` before routing.
   * When provided, it overrides `path`; the window is still opened synchronously to preserve the user
   * gesture (popup blockers), then redirected once the path resolves.
   */
  resolvePath?: () => Promise<string>;
  /** Called once the opened popup window is closed (e.g. to refetch state after an OAuth grant). */
  onClosed?: () => void;
};

function watchPopupClosed(win: Window, onClosed: () => void): void {
  const timer = window.setInterval(() => {
    if (win.closed) {
      window.clearInterval(timer);
      onClosed();
    }
  }, 800);
}

export function openTowerAppPath(path: string, options: OpenTowerAppPathOptions = {}): void {
  // Open synchronously inside the click gesture so popup blockers allow it; fill the URL after any
  // async work (path resolution, one-time-token mint) completes.
  const win = options.popup
    ? window.open("about:blank", "tower-app", TOWER_POPUP_WINDOW_FEATURES)
    : window.open("about:blank", "_blank");
  if (!win) {
    return;
  }
  if (options.onClosed) {
    watchPopupClosed(win, options.onClosed);
  }
  void (async () => {
    const resolvedPath = options.resolvePath ? await options.resolvePath() : path;
    const directUrl = buildTowerAppUrl(resolvedPath);
    if (!directUrl) {
      win.close();
      return;
    }
    if (!readBeaconTowerSessionToken()) {
      win.location.replace(directUrl);
      return;
    }
    const token = await mintTowerHandoffToken();
    if (!token) {
      win.location.replace(directUrl);
      return;
    }
    const handoffUrl = buildTowerAppUrl(
      `/api/beacon-handoff?ott=${encodeURIComponent(token)}&callbackUrl=${encodeURIComponent(resolvedPath)}`
    );
    win.location.replace(handoffUrl ?? directUrl);
  })();
}

/** The Webflow site currently open in the Designer, scoped onto the connection path, or `/connection`. */
async function resolveCurrentSiteConnectionPath(): Promise<string> {
  let siteId = "";
  try {
    const info = await webflow.getSiteInfo();
    siteId = typeof info?.siteId === "string" ? info.siteId.trim() : "";
  } catch {
    /* siteId is optional — the connection screen still works without it. */
  }
  return siteId ? `/connection?siteId=${encodeURIComponent(siteId)}` : "/connection";
}

/**
 * Opens Tower's Webflow connection screen in a popup, scoped to the site currently open in the Designer
 * so the user can authorize/relink the workspace that owns it. Use this when a feature needs the current
 * site linked — it lands on `/connection` (signed-in via one-time-token handoff), not the dashboard.
 *
 * `onClosed` fires when the popup closes so callers can refetch Tower state (the newly granted site then
 * unlocks without a manual reload).
 */
export function openTowerWebflowConnect(onClosed?: () => void): void {
  openTowerAppPath("/connection", { popup: true, resolvePath: resolveCurrentSiteConnectionPath, onClosed });
}

/**
 * The only destination the OAuth popup may be pointed at. Tower mints the authorize URL, but the
 * client still allowlists it (Marketplace OAuth guidance): a compromised or misconfigured response
 * must not be able to redirect the popup anywhere but Webflow's consent screen.
 */
function isAllowedWebflowAuthorizeUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return url.protocol === "https:" && url.hostname === "webflow.com" && url.pathname === "/oauth/authorize";
}

/**
 * Opens the Webflow OAuth consent screen directly in a popup — the same flow as Tower's "Relink", but
 * skipping the Tower `/connection` page. Mints an authorize URL from Tower (`POST` with the Designer
 * bearer; server stores the OAuth `state`→user/org so the cookie-less popup callback can resolve it),
 * then points the popup at `webflow.com/oauth/authorize`. On grant, Webflow → Tower callback → success
 * page closes the popup, which trips `onClosed` so the caller can refetch the now-updated grant.
 *
 * Must be called inside a user gesture (the blank popup is opened synchronously). Resolves to the
 * authorize error code (`team_admin_required`, `no_active_workspace`, `unauthorized`, …) when Tower
 * declines, or `popup_blocked` when the browser blocks the window.
 */
export async function openWebflowOAuthAuthorize(
  onClosed?: () => void
): Promise<{ ok: true } | { ok: false; error: string }> {
  const win = window.open("about:blank", "webflow-oauth-authorize", TOWER_POPUP_WINDOW_FEATURES);
  if (!win) {
    return { ok: false, error: "popup_blocked" };
  }
  try {
    const res = await towerFetch("/api/integrations/webflow/authorize", { method: "POST" });
    const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!res.ok || !data?.url) {
      win.close();
      return { ok: false, error: data?.error ?? `http_${res.status}` };
    }
    if (!isAllowedWebflowAuthorizeUrl(data.url)) {
      win.close();
      return { ok: false, error: "invalid_authorize_url" };
    }
    win.location.replace(data.url);
    if (onClosed) {
      watchPopupClosed(win, onClosed);
    }
    return { ok: true };
  } catch {
    win.close();
    return { ok: false, error: "tower_unreachable" };
  }
}

/** Opens the Tower dashboard entry (app host) in a new tab. */
export function openTowerAppHome(): void {
  openTowerAppPath(TOWER_APP_ENTRY_PATH);
}
