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
export function openTowerAppPath(path: string): void {
  const directUrl = buildTowerAppUrl(path);
  if (!directUrl) {
    return;
  }
  if (!readBeaconTowerSessionToken()) {
    window.open(directUrl, "_blank", "noopener,noreferrer");
    return;
  }
  const handoffWindow = window.open("about:blank", "_blank");
  if (!handoffWindow) {
    window.open(directUrl, "_blank", "noopener,noreferrer");
    return;
  }
  void mintTowerHandoffToken().then((token) => {
    if (!token) {
      handoffWindow.location.replace(directUrl);
      return;
    }
    const handoffUrl = buildTowerAppUrl(
      `/api/beacon-handoff?ott=${encodeURIComponent(token)}&callbackUrl=${encodeURIComponent(path)}`
    );
    handoffWindow.location.replace(handoffUrl ?? directUrl);
  });
}

/** Opens the Tower dashboard entry (app host) in a new tab. */
export function openTowerAppHome(): void {
  openTowerAppPath(TOWER_APP_ENTRY_PATH);
}
