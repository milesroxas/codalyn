import { createAuthClient } from "better-auth/react";
import { readBeaconTowerSessionToken } from "@/features/auth/lib/beacon-tower-session-token";
import { isAllowedWebflowAuthorizeUrl } from "@/features/auth/lib/tower-app-link";
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

/**
 * Valid URL required by the client; session hooks only run when Tower is configured in the UI.
 * The RFC 2606 `.invalid` sentinel is dev-only — release builds always embed the Tower origin
 * (asserted by the build guard), so the sentinel URL is compiled out of shipped bundles and
 * a missing origin fails loudly instead of shipping an unreachable placeholder.
 */
function unconfiguredTowerBaseUrl(): string {
  if (import.meta.env.DEV) {
    return "https://beacon.tower.invalid";
  }
  // Build-configuration failure. Named without env-var identifiers so no developer-configuration tokens
  // ship as strings in the reviewed bundle; the release build already fails loudly when this is unset.
  throw new Error("Codalyn service origin missing from this build");
}

export const towerAuthClient = createAuthClient({
  baseURL: baseURL || unconfiguredTowerBaseUrl(),
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
