import { readBeaconTowerSessionToken } from "@/features/auth/lib/beacon-tower-session-token";
import { isAllowedWebflowAuthorizeUrl } from "@/features/auth/lib/tower-app-link";
import { isBeaconTowerOriginConfigured, readBeaconTowerOrigin } from "@/shared/lib/beacon-tower-origin";
import { towerFetch } from "@/shared/lib/tower-client";

/**
 * Tower origin baked into this build (empty when the build carries none — dev only; release builds
 * assert it). Session reads, sign-in and sign-out live in `tower-session-client.ts`: the extension
 * talks to Tower's Better Auth endpoints through its own `towerFetch` and bundles no third-party
 * auth client (App Review Preflight 2026-09-14, "External API Calls" / "Insecure Protocols").
 */
const baseURL = readBeaconTowerOrigin();

/** Entry route for opening Tower from Beacon (host-split app host, not marketing `/`). */
export const TOWER_APP_ENTRY_PATH = "/auth/continue";

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

/**
 * Mints a single-use Tower handoff token for the current Designer session, or null on failure.
 *
 * Consumed by `useTowerAppLink`: the token is minted ahead of the click so a plain
 * `<a target="_blank">` can carry the `/beacon-handoff#ott=…` URL — the extension opens no windows
 * itself (Marketplace popup guidance). Tokens are single-use and live 3 minutes; a leaked value
 * cannot replay a session.
 */
export async function mintTowerHandoffToken(): Promise<string | null> {
  if (!readBeaconTowerSessionToken()) {
    return null;
  }
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

export type MintWebflowAuthorizeUrlResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Mints the Webflow OAuth consent URL for the current site's workspace. Tower stores the OAuth
 * `state` → user/org binding server-side (`POST /api/integrations/webflow/authorize`, Designer bearer)
 * so the cookie-less callback can resolve it; the returned URL is allowlisted to exactly
 * `https://webflow.com/oauth/authorize` before it is ever rendered into an anchor.
 *
 * Resolves the authorize error code (`team_admin_required`, `no_active_workspace`, `unauthorized`,
 * `webflow_identity_required`, …) when Tower declines, `invalid_authorize_url` when the response fails
 * the allowlist, or `tower_unreachable` on a network failure.
 */
export async function mintWebflowAuthorizeUrl(): Promise<MintWebflowAuthorizeUrlResult> {
  try {
    const res = await towerFetch("/api/integrations/webflow/authorize", { method: "POST" });
    const data = (await res.json().catch(() => null)) as { url?: unknown; error?: unknown } | null;
    if (!res.ok || typeof data?.url !== "string") {
      const error = typeof data?.error === "string" && data.error ? data.error : `http_${res.status}`;
      return { ok: false, error };
    }
    if (!isAllowedWebflowAuthorizeUrl(data.url)) {
      return { ok: false, error: "invalid_authorize_url" };
    }
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, error: "tower_unreachable" };
  }
}
