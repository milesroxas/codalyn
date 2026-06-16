import { createAuthClient } from "better-auth/react";
import { readBeaconTowerSessionToken } from "@/features/auth/lib/beacon-tower-session-token";
import { isBeaconTowerOriginConfigured, readBeaconTowerOrigin } from "@/shared/lib/beacon-tower-origin";
import { towerFetch } from "@/shared/lib/tower-client";

const baseURL = readBeaconTowerOrigin();

/** Entry route for opening Tower from Beacon (host-split app host, not marketing `/`). */
export const TOWER_APP_ENTRY_PATH = "/auth/continue";

/** Valid URL required by the client; session hooks only run when Tower is configured in the UI. */
export const towerAuthClient = createAuthClient({
  baseURL: baseURL || "https://beacon.tower.invalid",
  fetchOptions: {
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
};

export function openTowerAppPath(path: string, options: OpenTowerAppPathOptions = {}): void {
  // Open synchronously inside the click gesture so popup blockers allow it; fill the URL after any
  // async work (path resolution, one-time-token mint) completes.
  const win = options.popup
    ? window.open("about:blank", "tower-app", TOWER_POPUP_WINDOW_FEATURES)
    : window.open("about:blank", "_blank");
  if (!win) {
    return;
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
 */
export function openTowerWebflowConnect(): void {
  openTowerAppPath("/connection", { popup: true, resolvePath: resolveCurrentSiteConnectionPath });
}

/** Opens the Tower dashboard entry (app host) in a new tab. */
export function openTowerAppHome(): void {
  openTowerAppPath(TOWER_APP_ENTRY_PATH);
}
