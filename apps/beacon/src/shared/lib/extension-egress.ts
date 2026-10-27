import { readBeaconTowerOrigin } from "@/shared/lib/beacon-tower-origin";
import {
  WEBFLOW_ASSET_UPLOAD_BUCKET,
  WEBFLOW_ASSET_UPLOAD_BUCKET_HOST,
  WEBFLOW_ASSET_UPLOAD_HOST,
} from "@/shared/lib/webflow-asset-upload-endpoint";

/**
 * The extension's single network egress point (Webflow Marketplace review, App Review Preflight
 * "External API Calls").
 *
 * Every request the Designer Extension makes leaves through {@link extensionFetch}; it is the only
 * platform-fetch call in the shipped bundle and the release build fails if a second one appears
 * (`pinnedMarkerCounts` in scripts/build-cli.mjs). The destination policy lives next to the call so a
 * reviewer reading the evidence excerpt sees exactly where bytes can go:
 *
 * 1. **Tower** — the first-party backend origin baked into this build (`__BEACON_TOWER_ORIGIN__`,
 *    `https://tower.codalyn.app` on the production channel). Auth, Webflow Data API proxying, AVIF
 *    conversion, settings.
 * 2. **Webflow asset upload** — the presigned `uploadUrl` Webflow's create-asset endpoint hands back
 *    for the published-site runtime script. Only the *exact* URL string from that response is
 *    accepted, once, after it has been registered through {@link grantWebflowAssetUpload} by the
 *    create-asset response adapter — and only when it has the documented shape (HTTPS,
 *    `s3.amazonaws.com`, bucket `webflow-prod-assets`). A URL that merely looks like an S3 endpoint
 *    is refused (review round 8, 2026-09-17: "Upload allowlist accepts any S3 bucket").
 *
 * Requests never follow redirects: `redirect` is pinned to `"error"` for every call, so a permitted
 * endpoint cannot bounce the request to another host the CSP happens to admit (review round 8:
 * "Egress check does not constrain redirects"). No caller needs a redirect — Tower answers its API
 * routes directly and the S3 POST returns a 2xx with no `success_action_redirect` field.
 *
 * Requests never carry cookies: `credentials` is pinned to `"omit"` for every call, so no `Cookie`
 * header leaves the extension and no `Set-Cookie` from a response is stored (Marketplace guidelines,
 * "Credentials and secrets": credential-bearing headers — `Authorization`, `Cookie`, or equivalent —
 * must never be forwarded to non-Webflow domains). The extension authenticates Tower with the bearer
 * `towerFetch` sets from the in-memory Designer session (Tower's own Better Auth token, minted after
 * the documented `webflow.getIdToken()` exchange — never a Webflow credential), and the presigned S3
 * POST is authenticated by the URL itself; neither destination has any use for a cookie. Before review
 * round 8 (2026-09-17, "External API Calls / third-party data egress") callers asked for the include
 * mode, which was inert in practice (third-party cookies from the extension iframe are blocked by
 * default) but declared a cookie-bearing request in the shipped bundle.
 *
 * Anything outside the policy is refused before a request is built (explicit
 * {@link EgressPolicyError}; nothing is partially applied), which mirrors the shipped CSP
 * `connect-src` — the policy here is the source-level control, the CSP the browser-enforced one.
 */

export type EgressDestination = "tower" | "webflow-asset-upload";

export class EgressPolicyError extends Error {
  readonly url: string;

  constructor(url: string, reason = "is neither the Tower origin nor a granted Webflow asset-upload URL") {
    super(`Extension egress refused: "${describeUrlForError(url)}" ${reason}.`);
    this.name = "EgressPolicyError";
    this.url = url;
  }
}

/** Error text never echoes an arbitrary caller string verbatim beyond a bounded prefix. */
function describeUrlForError(raw: string): string {
  return raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
}

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/**
 * True when `raw` names Webflow's upload bucket the way a create-asset `uploadUrl` does: HTTPS and
 * either the bucket as a virtual-hosted S3 host (`https://webflow-prod-assets.s3.amazonaws.com/`, what
 * production returns) or the documented path-style form (host exactly `s3.amazonaws.com`, the bucket as
 * the first path segment). No regional endpoints, no other bucket in either form, no lookalike hosts
 * (`webflow-asset-upload-endpoint.ts`). Shape only — the egress policy additionally requires the exact
 * URL to have been granted from a create-asset response ({@link grantWebflowAssetUpload}).
 */
export function isWebflowAssetUploadUrlShape(raw: string): boolean {
  const url = parseUrl(raw);
  if (url === null || url.protocol !== "https:" || url.username !== "" || url.password !== "") {
    return false;
  }
  // `URL` already lowercases and punycodes the host; it also resolves userinfo tricks
  // (`https://s3.amazonaws.com@evil.example/`) to the real host before we ever see it.
  if (url.hostname === WEBFLOW_ASSET_UPLOAD_BUCKET_HOST) {
    return true;
  }
  if (url.hostname !== WEBFLOW_ASSET_UPLOAD_HOST) {
    return false;
  }
  const [bucket] = url.pathname.split("/").filter((segment) => segment.length > 0);
  return bucket === WEBFLOW_ASSET_UPLOAD_BUCKET;
}

/**
 * Upload URLs the create-asset response adapter has handed to the policy, keyed by the exact string
 * Webflow returned. One grant serves one request: {@link extensionFetch} consumes it. The set only
 * ever holds URLs that passed {@link isWebflowAssetUploadUrlShape}.
 */
const grantedAssetUploadUrls = new Set<string>();

/**
 * Registers the exact `uploadUrl` from a Webflow create-asset response as a one-shot permitted
 * destination. Called by the boundary adapter that parses that response, nowhere else. Throws
 * {@link EgressPolicyError} (and grants nothing) when the value does not have the documented shape.
 */
export function grantWebflowAssetUpload(uploadUrl: string): string {
  if (!isWebflowAssetUploadUrlShape(uploadUrl)) {
    throw new EgressPolicyError(
      uploadUrl,
      "is not a Webflow presigned upload URL (expected the webflow-prod-assets bucket on s3.amazonaws.com, virtual-hosted or path-style)"
    );
  }
  grantedAssetUploadUrls.add(uploadUrl);
  return uploadUrl;
}

/** Test seam only: drops every outstanding grant. */
export function resetWebflowAssetUploadGrantsForTests(): void {
  grantedAssetUploadUrls.clear();
}

/**
 * True when `raw` targets the Tower origin baked into this build (exact origin match — scheme, host
 * and port; the path is free).
 *
 * Every build bakes an origin (`vite.config` resolves one per mode, Vitest included, and release
 * builds assert it in the output). An unconfigured origin refuses everything rather than guessing a
 * destination, relative paths included.
 */
export function isTowerUrl(raw: string): boolean {
  const towerOrigin = readBeaconTowerOrigin();
  if (towerOrigin.length === 0) {
    return false;
  }
  const url = parseUrl(raw);
  const tower = parseUrl(towerOrigin);
  return url !== null && tower !== null && url.origin === tower.origin;
}

/** Classifies a URL against the egress policy; `null` means the request must not be made. */
export function resolveEgressDestination(raw: string): EgressDestination | null {
  if (isTowerUrl(raw)) {
    return "tower";
  }
  if (grantedAssetUploadUrls.has(raw) && isWebflowAssetUploadUrlShape(raw)) {
    return "webflow-asset-upload";
  }
  return null;
}

/**
 * The extension's only network call. Refuses (rejects with {@link EgressPolicyError}) before
 * building a request when the destination is outside {@link resolveEgressDestination}; otherwise a
 * plain `fetch` with the caller's `init`, `redirect` pinned to `"error"` (a caller cannot opt back
 * into following redirects) and `credentials` pinned to `"omit"` (a caller cannot attach cookies).
 * A granted upload URL is consumed by the call that uses it. Callers own headers and retries
 * (`towerFetch` adds the Designer-session bearer, `towerFetchWithRetry` the 429 backoff).
 */
export function extensionFetch(url: string, init?: RequestInit): Promise<Response> {
  const destination = resolveEgressDestination(url);
  if (destination === null) {
    return Promise.reject(new EgressPolicyError(url));
  }
  if (destination === "webflow-asset-upload") {
    grantedAssetUploadUrls.delete(url);
  }
  return fetch(url, { ...init, redirect: "error", credentials: "omit" });
}
