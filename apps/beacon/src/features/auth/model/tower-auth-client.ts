import { createAuthClient } from "better-auth/react";
import {
  clearBeaconTowerSessionToken,
  readBeaconTowerSessionToken,
} from "@/features/auth/lib/beacon-tower-session-token";
import { isBeaconTowerOriginConfigured, readBeaconTowerOrigin } from "@/shared/lib/beacon-tower-origin";

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
    onResponse(context) {
      const path = String(context.request.url);
      if (path.includes("/sign-out")) {
        clearBeaconTowerSessionToken();
      }
    },
  },
});

export function getTowerAuthBaseUrl(): string {
  return baseURL;
}

export function isTowerConfigured(): boolean {
  return isBeaconTowerOriginConfigured();
}

const TOWER_AUTH_POPUP_FEATURES = "popup=yes,width=540,height=780,scrollbars=yes,resizable=yes";

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

/** Opens Tower sign-in or sign-up in a popup for Beacon (Designer extension) flows. */
export function openTowerAuthPopup(path: "/sign-in" | "/sign-up"): void {
  const url = buildTowerAuthPopupUrl(path, window.location.origin);
  if (!url) {
    return;
  }
  window.open(url, "beacon-tower-auth", TOWER_AUTH_POPUP_FEATURES);
}

/** Opens a Tower app route in a new browser tab. */
export function openTowerAppPath(path: string): void {
  const url = buildTowerAppUrl(path);
  if (!url) {
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Opens the Tower dashboard entry (app host) in a new tab. */
export function openTowerAppHome(): void {
  openTowerAppPath(TOWER_APP_ENTRY_PATH);
}
