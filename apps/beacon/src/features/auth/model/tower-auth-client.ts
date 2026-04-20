import { createAuthClient } from "better-auth/react";
import {
  BEACON_TOWER_SESSION_TOKEN_KEY,
  readBeaconTowerSessionToken,
} from "@/features/auth/lib/webflow-designer-session";

const baseURL = import.meta.env.VITE_TOWER_ORIGIN?.replace(/\/$/, "") ?? "";

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
        try {
          localStorage.removeItem(BEACON_TOWER_SESSION_TOKEN_KEY);
          sessionStorage.removeItem(BEACON_TOWER_SESSION_TOKEN_KEY);
        } catch {
          /* ignore */
        }
      }
    },
  },
});

export function getTowerAuthBaseUrl(): string {
  return baseURL;
}

export function isTowerConfigured(): boolean {
  return Boolean(baseURL);
}
