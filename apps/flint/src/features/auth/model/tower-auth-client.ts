import { createAuthClient } from "better-auth/react";
import { readFlintTowerSessionToken } from "@/features/auth/lib/flint-tower-session-token";
import { isFlintTowerOriginConfigured, readFlintTowerOrigin } from "@/shared/lib/flint-tower-origin";
import { towerFetch } from "@/shared/lib/tower-client";

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

function buildTowerAppUrl(path: string): string | null {
  if (!baseURL) {
    return null;
  }
  return `${baseURL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Single-use Tower handoff token so a freshly opened Tower tab lands signed-in instead of bouncing to /sign-in. */
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
 * Opens Tower's web "Connect Webflow" page for the Flint app in a new tab. Mirrors Beacon: when the
 * Designer session holds a Tower bearer, route through a one-time-token handoff so Tower establishes
 * a first-party cookie session; otherwise fall back to the plain page (which enforces its own auth —
 * the first-ever Flint user signs up there, then connects). Connecting pools a Flint token so all
 * subsequent Designer sign-ins resolve.
 */
export function openTowerWebflowConnect(): void {
  const callbackPath = "/connection?app=flint";
  const directUrl = buildTowerAppUrl(callbackPath);
  if (!directUrl) {
    return;
  }
  if (!readFlintTowerSessionToken()) {
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
      `/api/beacon-handoff?ott=${encodeURIComponent(token)}&callbackUrl=${encodeURIComponent(callbackPath)}`
    );
    handoffWindow.location.replace(handoffUrl ?? directUrl);
  });
}
