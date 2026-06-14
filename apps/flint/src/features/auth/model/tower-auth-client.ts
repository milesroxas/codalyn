import { createAuthClient } from "better-auth/react";
import { readFlintTowerSessionToken } from "@/features/auth/lib/flint-tower-session-token";
import { isFlintTowerOriginConfigured, readFlintTowerOrigin } from "@/shared/lib/flint-tower-origin";

const baseURL = readFlintTowerOrigin();

/**
 * Better Auth client for Tower. A valid URL is required by the client even when
 * Tower is not configured; session hooks only run once `isTowerConfigured()` is
 * true, so the placeholder origin is never contacted in the free/offline path.
 */
export const towerAuthClient = createAuthClient({
  baseURL: baseURL || "https://flint.tower.invalid",
  fetchOptions: {
    onRequest(context) {
      const t = readFlintTowerSessionToken();
      if (t) {
        context.headers.set("Authorization", `Bearer ${t}`);
      }
    },
  },
});

export function getTowerAuthBaseUrl(): string {
  return baseURL;
}

export function isTowerConfigured(): boolean {
  return isFlintTowerOriginConfigured();
}
