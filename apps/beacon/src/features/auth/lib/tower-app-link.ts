import { CODALYN_EXTERNAL_LINK_REL } from "@/shared/lib/codalyn-links";

/**
 * Pure rules for the anchors that take the user from the Designer extension to Tower or to Webflow's
 * OAuth consent screen. The extension renders plain `<a target="_blank" rel="noopener noreferrer">`
 * links for every external destination — never `window.open` — so the browser performs an ordinary
 * user-initiated navigation, no script spawns a window, and the extension never holds a handle to the
 * opened document (Marketplace popup guidance; App Review Preflight "Prohibited Popups").
 *
 * The cost of an anchor over a scripted window is that the `href` must be known at click time, so the
 * single-use handoff token / OAuth `state` is minted ahead of the click and refreshed when stale.
 */

export type ExternalAnchorProps = {
  href: string;
  target: "_blank";
  rel: typeof CODALYN_EXTERNAL_LINK_REL;
};

export function externalAnchorProps(href: string): ExternalAnchorProps {
  return { href, target: "_blank", rel: CODALYN_EXTERNAL_LINK_REL };
}

/**
 * Tower one-time tokens live 3 minutes (`oneTimeToken({ expiresIn: 3 })` in Tower's auth config). A
 * pre-minted token older than this is re-minted on hover/focus so the click lands with a live one;
 * the margin covers a slow mint round-trip plus the hover → click delay.
 */
export const TOWER_HANDOFF_TOKEN_STALE_MS = 90_000;

export function isTowerHandoffTokenStale(mintedAt: number, now: number): boolean {
  return now - mintedAt >= TOWER_HANDOFF_TOKEN_STALE_MS;
}

/**
 * Tower's Designer-flow OAuth `state` rows expire after 10 minutes (`state_expired` in the callback).
 * Re-mint on hover/focus once past this so the consent link never points at a dead state.
 */
export const WEBFLOW_AUTHORIZE_URL_STALE_MS = 8 * 60_000;

export function isWebflowAuthorizeUrlStale(mintedAt: number, now: number): boolean {
  return now - mintedAt >= WEBFLOW_AUTHORIZE_URL_STALE_MS;
}

/**
 * Session-handoff URL for a freshly opened Tower tab. The one-time token travels in the URL
 * **fragment**, never a query parameter: fragments are not sent to the server, so the token cannot
 * land in server, proxy, or CDN access logs (Marketplace round-6 requirement). Tower's
 * `/beacon-handoff` page strips the fragment from history immediately and redeems the token via
 * `POST /api/beacon-handoff` (JSON body).
 */
export function buildTowerHandoffUrl(towerOrigin: string, token: string, callbackPath: string): string {
  const normalizedPath = callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`;
  return `${towerOrigin}/beacon-handoff#ott=${encodeURIComponent(token)}&callbackUrl=${encodeURIComponent(normalizedPath)}`;
}

/**
 * The `href` for a Tower app route: the one-time-token handoff when a token is available (so Tower
 * establishes a first-party cookie session instead of bouncing to sign-in), else the plain route,
 * which enforces its own auth. `null` when no Tower origin is configured for this build.
 */
export function resolveTowerAppHref(input: { towerOrigin: string; path: string; token: string | null }): string | null {
  const origin = input.towerOrigin.trim();
  if (!origin) {
    return null;
  }
  const normalizedPath = input.path.startsWith("/") ? input.path : `/${input.path}`;
  if (input.token) {
    return buildTowerHandoffUrl(origin, input.token, normalizedPath);
  }
  return `${origin}${normalizedPath}`;
}

/** Tower's connection screen scoped to the site open in the Designer (or unscoped when unknown). */
export function towerConnectionPathForSite(siteId: string | null | undefined): string {
  const id = siteId?.trim() ?? "";
  return id ? `/connection?siteId=${encodeURIComponent(id)}` : "/connection";
}

/** The exact origin and path of Webflow's OAuth consent screen — the only destination the consent link may open. */
export const WEBFLOW_OAUTH_AUTHORIZE_ORIGIN = "https://webflow.com";
export const WEBFLOW_OAUTH_AUTHORIZE_PATH = "/oauth/authorize";

/**
 * The only destination the OAuth consent link may point at. Tower mints the authorize URL, but the
 * client still allowlists it (Marketplace guidelines, "Request handling": external redirects lead only
 * to trusted domains you declare): a compromised or misconfigured response must not be able to send the
 * user anywhere but Webflow's consent screen.
 *
 * Exact-origin match (`url.origin`, so a non-default port is a different origin and refused), the exact
 * `/oauth/authorize` path (no trailing slash, no sub-path) and no URL credentials — `new URL()` drops
 * `user:pass@` from `origin`, so `username` / `password` are checked on their own (review round 9).
 */
export function isAllowedWebflowAuthorizeUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return (
    url.origin === WEBFLOW_OAUTH_AUTHORIZE_ORIGIN &&
    url.pathname === WEBFLOW_OAUTH_AUTHORIZE_PATH &&
    url.username === "" &&
    url.password === ""
  );
}
