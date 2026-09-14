import { readBeaconTowerOrigin } from "@/shared/lib/beacon-tower-origin";

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
 *    conversion, telemetry consent state.
 * 2. **Webflow asset upload** — the presigned `uploadUrl` Webflow's create-asset endpoint hands back
 *    for the published-site runtime script: HTTPS on a Webflow-owned host or an Amazon S3 endpoint
 *    host, nothing else.
 *
 * Anything outside the policy is refused before a request is built (explicit
 * {@link EgressPolicyError}; nothing is partially applied), which mirrors the shipped CSP
 * `connect-src` — the policy here is the source-level control, the CSP the browser-enforced one.
 * The third-party telemetry SDK (PostHog, opt-in) ships its own transport and is disclosed
 * separately; it is not routed through this module.
 */

export type EgressDestination = "tower" | "webflow-asset-upload";

export class EgressPolicyError extends Error {
  readonly url: string;

  constructor(url: string) {
    super(
      `Extension egress refused: "${describeUrlForError(url)}" is neither the Tower origin nor a Webflow asset-upload endpoint.`
    );
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
 * Amazon S3 endpoint host shapes, the only AWS service Webflow's create-asset endpoint hands back a presigned
 * POST target on. Deliberately narrower than `*.amazonaws.com` (which would admit every AWS-hosted bucket and
 * every other AWS service endpoint):
 *
 * - `s3.amazonaws.com` / `s3.<region>.amazonaws.com` / `s3-<region>.amazonaws.com` — path-style (bucket in the
 *   path); this is the shape the Webflow Data API documents for `uploadUrl`.
 * - `<bucket>.s3.amazonaws.com` / `<bucket>.s3.<region>.amazonaws.com` / `<bucket>.s3-<region>.amazonaws.com` —
 *   virtual-hosted style, in case the endpoint moves to it.
 *
 * The region label must look like a real AWS region (`us-east-1`, `eu-central-1`, `us-gov-west-1`, `cn-north-1`)
 * so a service/label subdomain such as `s3.evil.amazonaws.com` cannot pose as one. The bucket label is left
 * generic on purpose: pinning Webflow's current bucket name would break the install flow the moment they rotate
 * it, and the presigned URL is already an opaque value handed back by Webflow's own authenticated endpoint.
 */
const AWS_S3_UPLOAD_HOST_RE = /^(?:[a-z0-9][a-z0-9.-]*\.)?s3(?:[.-][a-z]{2}(?:-[a-z]+)+-\d{1,2})?\.amazonaws\.com$/;

/** Webflow-owned upload/CDN hosts (apex + subdomains). */
const WEBFLOW_UPLOAD_HOST_SUFFIXES = ["webflow.com", "website-files.com"] as const;

/**
 * The presigned upload URL is the one outbound call in the install flow that does not go through
 * Tower's proxy, so it is allowlisted client-side: only HTTPS endpoints on Webflow's own hosts or on
 * an Amazon S3 endpoint host are accepted. Lookalike hosts (`amazonaws.com.evil.com`,
 * `webflow.com.evil.com`) and non-S3 AWS hosts (`evil-bucket.amazonaws.com`) are rejected — suffix
 * matching is anchored on a dot-delimited label boundary.
 */
export function isAllowedAssetUploadUrl(raw: string): boolean {
  const url = parseUrl(raw);
  if (url === null || url.protocol !== "https:") {
    return false;
  }
  // `URL` already lowercases and punycodes the host; it also resolves userinfo tricks
  // (`https://s3.amazonaws.com@evil.example/`) to the real host before we ever see it.
  const host = url.hostname;
  for (const suffix of WEBFLOW_UPLOAD_HOST_SUFFIXES) {
    if (host === suffix || host.endsWith(`.${suffix}`)) {
      return true;
    }
  }
  return AWS_S3_UPLOAD_HOST_RE.test(host);
}

/**
 * True when `raw` targets the Tower origin baked into this build (exact origin match — scheme, host
 * and port; the path is free).
 *
 * Every browser build bakes an origin (`vite.config` resolves one for each mode and release builds
 * assert it in the output), so a relative path is only meaningful under Vitest, where the origin is
 * deliberately empty and Tower paths resolve against the test document. Outside the test mode an
 * unconfigured origin refuses everything rather than guessing a destination.
 */
export function isTowerUrl(raw: string): boolean {
  const towerOrigin = readBeaconTowerOrigin();
  if (towerOrigin.length === 0) {
    return import.meta.env.MODE === "test" && raw.startsWith("/") && !raw.startsWith("//");
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
  if (isAllowedAssetUploadUrl(raw)) {
    return "webflow-asset-upload";
  }
  return null;
}

/**
 * The extension's only network call. Refuses (rejects with {@link EgressPolicyError}) before
 * building a request when the destination is outside {@link resolveEgressDestination}; otherwise a
 * plain `fetch` with the caller's `init`. Callers own headers, credentials and retries
 * (`towerFetch` adds the Designer-session bearer, `towerFetchWithRetry` the 429 backoff).
 */
export function extensionFetch(url: string, init?: RequestInit): Promise<Response> {
  if (resolveEgressDestination(url) === null) {
    return Promise.reject(new EgressPolicyError(url));
  }
  return fetch(url, init);
}
