import { CODALYN_POSTHOG_HOST } from "@codalyn/observability";

/**
 * Enforced Content-Security-Policy for the shipped extension documents (Webflow Marketplace,
 * Telemetry / External Endpoint Allowlisting): Webflow serves Designer Extension bundles without
 * giving apps any response-header control and `webflow.json` has no CSP field, so a
 * `<meta http-equiv="Content-Security-Policy">` tag in each shipped document is the only
 * enforcement point the app owns. The policies below turn the endpoint inventory previously
 * documented for review (compliance doc R6.4) into browser-enforced allowlists — any request to a
 * host outside them is blocked by the browser, not merely absent from the code.
 *
 * Both policies are built here as pure functions so unit tests can pin every directive; the Vite
 * plugin in vite.config.ts substitutes them into the HTML entries at build time (the Tower origin
 * is a build-time value — production, preview, and local builds bake different hosts).
 */

/**
 * Placeholder carried in the source HTML entries. Build replaces it with the real policy;
 * dev serve strips the whole meta tag (Vite HMR needs websockets and inline preamble scripts
 * a production policy must not allow).
 */
export const BEACON_CSP_PLACEHOLDER = "__BEACON_CSP__";

/**
 * Webflow-owned asset/CDN hosts. Needed in `img-src` (site assets returned by the Designer API's
 * `asset.getUrl()` / `asset.url` and Webflow-hosted account avatars render in the extension UI)
 * and in `connect-src` (the CMS Slots install flow POSTs the runtime JS to the presigned upload
 * URL handed back by Webflow's create-asset endpoint, allowlist-checked in
 * `isAllowedAssetUploadUrl` before any request is made).
 */
const WEBFLOW_ASSET_HOST_SOURCES = [
  "https://webflow.com",
  "https://*.webflow.com",
  "https://website-files.com",
  "https://*.website-files.com",
] as const;

/**
 * Amazon S3 endpoint hosts for the same presigned upload (the shape Webflow's Data API documents
 * for `uploadUrl`). Deliberately narrower than the defensive runtime validator
 * (`AWS_S3_UPLOAD_HOST_RE` also tolerates regional endpoints, which CSP host-source syntax cannot
 * express without admitting all of `*.amazonaws.com`): if Webflow ever moves the endpoint to a
 * regional host, the upload fails closed with a visible error and this list gets the new host —
 * the policy never widens preemptively.
 */
const AWS_S3_UPLOAD_HOST_SOURCES = ["https://s3.amazonaws.com", "https://*.s3.amazonaws.com"] as const;

function serializeCsp(directives: ReadonlyArray<readonly [string, ReadonlyArray<string>]>): string {
  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}

/**
 * Shared style-src posture: external stylesheets are first-party only; inline `style`
 * *attributes* are allowed because React `style` props and the bundled Radix/vaul primitives set
 * them (CSP3 splits the two via style-src-elem/-attr — the plain style-src fallback keeps
 * `'unsafe-inline'` so pre-CSP3 engines allow attributes rather than breaking layout). Inline
 * `<style>` elements stay blocked in every CSP3 browser; both shipped documents are pinned by
 * tests to contain none regardless.
 */
const STYLE_DIRECTIVES = [
  ["style-src", ["'self'", "'unsafe-inline'"]],
  ["style-src-elem", ["'self'"]],
  ["style-src-attr", ["'unsafe-inline'"]],
] as const;

const HARDENING_DIRECTIVES = [
  ["object-src", ["'none'"]],
  ["frame-src", ["'none'"]],
  ["worker-src", ["'none'"]],
  ["form-action", ["'none'"]],
  ["base-uri", ["'none'"]],
] as const;

/**
 * Policy for the Designer Extension iframe (index.html). `connect-src` is the complete external
 * endpoint list from the review submission: the first-party Tower backend, the single telemetry
 * processor (PostHog US ingestion, reachable only after opt-in consent — the SDK is not
 * initialized before a grant), and the Webflow/S3 presigned-upload hosts used by the
 * user-initiated CMS Slots install. No other host is reachable even if code regressed.
 */
export function buildBeaconExtensionCspContent(towerOrigin: string): string {
  return serializeCsp([
    ["default-src", ["'none'"]],
    ["script-src", ["'self'"]],
    ...STYLE_DIRECTIVES,
    // 'self' for the bundled images/ + logos; blob: for image-editor object URLs minted from the
    // user's own files; Webflow hosts for site assets and avatars. No data: URIs ship or render.
    ["img-src", ["'self'", "blob:", ...WEBFLOW_ASSET_HOST_SOURCES]],
    // Geist woff2 files bundled under assets/ — no external font host.
    ["font-src", ["'self'"]],
    [
      "connect-src",
      ["'self'", towerOrigin, CODALYN_POSTHOG_HOST, ...AWS_S3_UPLOAD_HOST_SOURCES, ...WEBFLOW_ASSET_HOST_SOURCES],
    ],
    ...HARDENING_DIRECTIVES,
  ]);
}

/**
 * Policy for the compression-compare popout window (quality-compare.html). The popout performs
 * zero network requests — data arrives via postMessage from the opener and renders through blob
 * object URLs — so `connect-src 'none'` enforces that claim outright. It links only the static
 * first-party stylesheet and the Vite module scripts.
 */
export function buildQualityComparePopoutCspContent(): string {
  return serializeCsp([
    ["default-src", ["'none'"]],
    ["script-src", ["'self'"]],
    ...STYLE_DIRECTIVES,
    ["img-src", ["blob:"]],
    ["connect-src", ["'none'"]],
    ...HARDENING_DIRECTIVES,
  ]);
}
