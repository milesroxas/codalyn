import { CODALYN_POSTHOG_HOST } from "@codalyn/observability";
import { WEBFLOW_ASSET_UPLOAD_HOST } from "./webflow-asset-upload-endpoint";

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
 * Webflow-owned asset/CDN hosts, `img-src` only: site assets returned by the Designer API's
 * `asset.getUrl()` / `asset.url` and Webflow-hosted account avatars render in the extension UI.
 * They are deliberately absent from `connect-src` — the extension makes no request to them.
 */
const WEBFLOW_ASSET_HOST_SOURCES = [
  "https://webflow.com",
  "https://*.webflow.com",
  "https://website-files.com",
  "https://*.website-files.com",
] as const;

/**
 * The one host the CMS Slots install flow POSTs the runtime JS to: the presigned `uploadUrl` from
 * Webflow's create-asset endpoint (`https://s3.amazonaws.com/webflow-prod-assets/…`). The exact URL
 * is granted per response in `extension-egress.ts` (`grantWebflowAssetUpload`); CSP host-source
 * syntax cannot express a bucket path, so the policy pins the host and the egress policy pins the
 * bucket and the exact URL. No wildcard subdomains: if Webflow ever moves the endpoint, the upload
 * fails closed with a visible error and this value changes through an App Update — the policy
 * never widens preemptively (review round 8, 2026-09-17).
 */
const WEBFLOW_ASSET_UPLOAD_SOURCES = [`https://${WEBFLOW_ASSET_UPLOAD_HOST}`] as const;

/**
 * Origin Webflow's hosted runtime serves the uploaded bundle's static files from. The installed
 * extension document does not live on this origin: Webflow rewrites the bundle's relative
 * `./bundle.js`, `<link rel="modulepreload">` and `./styles.css` references to
 * `https://cdn.prod.website-files.com/<upload id>/…`, and chunk `import()`s, `url(./*.woff2)` and
 * `url(images/…)` resolve against those rewritten URLs. With `'self'` alone every first-party script
 * and stylesheet is blocked and the extension renders blank (observed 2026-09-14 on
 * v0.1.0_public_09-14_13-55-57). The `<upload id>` path segment is minted per bundle upload, so it
 * cannot be baked in at build time — the host is the narrowest expressible source. Only this exact
 * host is admitted, not `*.website-files.com`.
 */
const WEBFLOW_HOSTED_BUNDLE_SOURCES = ["https://cdn.prod.website-files.com"] as const;

function serializeCsp(directives: ReadonlyArray<readonly [string, ReadonlyArray<string>]>): string {
  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}

/**
 * Shared style-src posture: stylesheets are first-party only (the document origin plus the
 * Webflow-hosted copy of the bundle's own `styles.css`) and inline styles are blocked in both forms
 * — no `<style>` element and no `style="…"` attribute (`style-src-attr 'none'`; review round 8,
 * 2026-09-17). The shipped UI needs neither: React `style` props, Radix, vaul and Lexical all set
 * styles through the CSSOM (`element.style.x = …`, `style.cssText`), which CSP does not govern;
 * only markup and `setAttribute` writes of the `style` attribute are attribute styles, and the
 * release build pins that shape in the bundle to the two Webflow Designer API calls that style the
 * user's canvas placeholder — a different document (`pinnedMarkerCounts`, scripts/build-cli.mjs).
 * Rendering under the enforced policy is verified by `scripts/csp-style-audit.mjs` over the
 * Storybook catalog.
 */
const STYLE_DIRECTIVES = [
  ["style-src", ["'self'", ...WEBFLOW_HOSTED_BUNDLE_SOURCES]],
  ["style-src-elem", ["'self'", ...WEBFLOW_HOSTED_BUNDLE_SOURCES]],
  ["style-src-attr", ["'none'"]],
] as const;

/** First-party module scripts: `bundle.js`, its preloaded chunks and lazy `import()`s. */
const SCRIPT_DIRECTIVE = ["script-src", ["'self'", ...WEBFLOW_HOSTED_BUNDLE_SOURCES]] as const;

const HARDENING_DIRECTIVES = [
  ["object-src", ["'none'"]],
  ["frame-src", ["'none'"]],
  ["worker-src", ["'none'"]],
  ["form-action", ["'none'"]],
  ["base-uri", ["'none'"]],
] as const;

export type BeaconExtensionCspOptions = {
  /**
   * Whether this build bundles the PostHog SDK (`VITE_BEACON_TELEMETRY_ENABLED=true`). Off — the
   * Marketplace build — the telemetry host is absent from `connect-src` altogether; on, it is
   * reachable only after opt-in consent (the SDK is not initialized before a grant).
   */
  telemetryEnabled: boolean;
};

/**
 * Policy for the Designer Extension iframe (index.html). `connect-src` is the complete external
 * endpoint list from the review submission: the first-party Tower backend, the single presigned
 * upload host used by the user-initiated CMS Slots install, and — only in telemetry-enabled builds
 * — the single telemetry processor. No other host is reachable even if code regressed.
 */
export function buildBeaconExtensionCspContent(towerOrigin: string, options: BeaconExtensionCspOptions): string {
  return serializeCsp([
    ["default-src", ["'none'"]],
    SCRIPT_DIRECTIVE,
    ...STYLE_DIRECTIVES,
    // 'self' for the bundled images/ + logos; blob: for image-editor object URLs minted from the
    // user's own files; Webflow hosts for site assets, avatars and the hosted bundle's images/
    // (covered by *.website-files.com). No data: URIs ship or render.
    ["img-src", ["'self'", "blob:", ...WEBFLOW_ASSET_HOST_SOURCES]],
    // Geist woff2 files bundled under assets/, resolved against the hosted styles.css — no
    // third-party font host.
    ["font-src", ["'self'", ...WEBFLOW_HOSTED_BUNDLE_SOURCES]],
    [
      "connect-src",
      [
        "'self'",
        towerOrigin,
        ...(options.telemetryEnabled ? [CODALYN_POSTHOG_HOST] : []),
        ...WEBFLOW_ASSET_UPLOAD_SOURCES,
      ],
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
    SCRIPT_DIRECTIVE,
    ...STYLE_DIRECTIVES,
    ["img-src", ["blob:"]],
    ["connect-src", ["'none'"]],
    ...HARDENING_DIRECTIVES,
  ]);
}
