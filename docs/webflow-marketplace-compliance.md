# Webflow Marketplace Compliance — Beacon

Point-by-point response to the Webflow app-review feedback (July 2026), mapping each flag to what
the app does and what changed. Doc references verified against developers.webflow.com on 2026-07-08.
Round-2 feedback (2026-07-09) is addressed in [Round 2](#round-2--2026-07-09-follow-up-flags);
round-3 feedback (2026-08) in [Round 3](#round-3--2026-08-senior-engineer--review-team-flags);
round-4 feedback (2026-08-05) in [Round 4](#round-4--2026-08-05-review-team-flags).
Where a later-round fix supersedes an earlier answer, the original item notes it.

## 1. Direct DOM manipulation / unsafe patterns

Guideline: "Do not use statements or patterns that could introduce vulnerabilities in your App
(e.g. `eval()` statements, direct DOM manipulation, …)" — [Marketplace Guidelines, Performance/Technical](https://developers.webflow.com/apps/docs/marketplace-guidelines).

- No `eval()` or `new Function()` exists in shipped first-party code (only in unit tests that load
  generated runtime source for assertions; tests are not bundled).
- **Fixed (superseded in round 2):** the image-quality compare popout previously used
  `document.open()/document.write()`, then a same-origin `Blob` URL document. It is now a static
  page shipped in the bundle with zero inline script/style — see Round 2, item 5.
- **Fixed:** PostHog now runs with `autocapture: false` and
  `disable_external_dependency_loading: true`, so the SDK never injects listeners into the
  extension DOM or lazy-loads remote scripts (`packages/observability` →
  `CODALYN_EXTENSION_POSTHOG_PRIVACY_OPTIONS`, consumed by both extensions'
  `init-observability.ts`).
- Remaining `document.createElement` uses are standard platform APIs inside the extension's own
  iframe (canvas-based image cropping, `<a download>` file export) — they never touch the Designer
  document. All canvas/page changes go through official Designer and Data APIs.
- Rich text saved to CMS passes a strict allowlist sanitizer
  (`cms-slot-rich-text-html.ts`: tag allowlist, subtree drops for script/style/iframe/object,
  `javascript:` URL rejection, forced `rel="noopener noreferrer"`).

## 2. Iframes

Guideline: "Avoid using externally hosted iframes for anything beyond authentication."

- First-party code creates no iframes.
- **Superseded in round 3:** the round-1 position that the bundled Sentry iframe behavior was
  dead SDK code was not accepted by review — Sentry is now removed from the extension bundle
  entirely (see Round 3, item R3.1).
- **Fixed:** PostHog can no longer inject its session-recording/surveys/toolbar iframes:
  `disable_session_recording: true`, `disable_surveys: true`, and
  `disable_external_dependency_loading: true` are now hard-coded for extension bundles.

## 3. Tracking / user data

Guideline: disclose collection/storage/use of user data; implement security measures — Marketplace
Guidelines, Privacy & Data Protection.

- **Fixed:** telemetry is operational-only by construction: no autocapture, no session recording,
  no pageview/pageleave capture, no surveys, `persistence: "memory"` (no tracking identifiers
  written to cookies/localStorage), `person_profiles: "identified_only"`. (Sentry references
  here are historical — removed from the bundle in Round 3, item R3.1.)
- **Fixed (superseded in round 2):** the round-1 model (default-on with in-app disclosure +
  opt-out under Settings → Preferences → Privacy) is now full opt-in with a first-run consent
  prompt — see Round 2, item 3. The Settings switch and disclosure remain.
- What is collected: exceptions, explicit product events (e.g. support/feedback submissions),
  app/version/channel super-properties, and PostHog group keys `site` (siteId, siteName,
  shortName) and `workspace` (workspaceId, workspaceSlug) from `webflow.getSiteInfo()` — disclosed
  in the Privacy section per item 9.

## 4. Webflow ID token exchange

Doc: [Get user ID token](https://developers.webflow.com/designer/reference/get-user-id-token) —
ID token valid 15 minutes; verification is via the Resolve ID Token endpoint.

- Tower already verifies exactly as documented: the raw ID token is POSTed server-side to
  `https://api.webflow.com/beta/token/resolve` with a Data Client bearer
  (`apps/tower/src/server/webflow-resolve-designer-id-token.ts`). Webflow performs
  signature/issuer/expiry validation and returns the resolved user identity; Tower trusts only the
  resolve response (user id + email), never token contents. (Webflow documents no local
  JWT/JWKS validation path — resolve-endpoint introspection is the entire documented flow.)
- **Hardened:** the exchange endpoint (`/api/auth/webflow-designer`) now has a per-IP Postgres
  rate limit (60/10 min, shared across serverless instances) and an ID-token length bound before
  anything reaches Webflow.

## 5. Token storage

Doc: [Authentication token security](https://developers.webflow.com/data/reference/authentication).

- **Fixed:** the Tower session token is no longer written to `localStorage`. Both extensions hold
  it in memory only (`beacon-tower-session-token.ts`, `flint-tower-session-token.ts`), with a
  one-time cleanup that deletes any token persisted by earlier builds. On reload, the silent
  `webflow.getIdToken()` exchange re-establishes the session — effectively rotating the bearer on
  every extension load.
- Rotation/revocation: sessions are opaque, DB-backed better-auth rows — revocable server-side and
  cleared on sign-out; each exchange issues a fresh token.
- Webflow OAuth access tokens were never stored client-side; see item 8.

## 6. OAuth redirect validation

Doc: [OAuth](https://developers.webflow.com/data/reference/oauth-app).

- `state` was already enforced: `crypto.randomUUID()` per authorize, stored server-side (httpOnly
  cookie for the dashboard flow; single-use DB row bound to user/org for the extension popup
  flow), validated and consumed on callback; missing/unknown state → `invalid_state`.
- `redirect_uri` comes from app settings/env and must match Webflow app configuration.
- **Fixed:** the extension now also allowlists the server-minted authorize URL before navigating
  the popup — only `https://webflow.com/oauth/authorize` is accepted
  (`tower-auth-client.ts` → `isAllowedWebflowAuthorizeUrl`).

## 7. Custom code / hosted scripts

Doc: [Working with Custom Code](https://developers.webflow.com/data/docs/working-with-custom-code).

Verified compliant as-is:

- The runtime script is uploaded as a Webflow-hosted asset (Webflow CDN URL — no third-party
  hosting) and registered via `POST /sites/{siteId}/registered_scripts/hosted` with an SRI
  `integrityHash` (SHA-384 of the exact source) and a unique semver `version` per build
  (`cms-slot-page-inline-script.ts`).
- Applied at page level with marker attributes for drift detection; full uninstall path removes
  scripts and purges unreferenced assets.
- Scopes are least-privilege for the feature set (`custom_code:read/write`, `assets:read/write`,
  …); missing-scope errors are surfaced to the user rather than escalated.
- Debug HUD source ships only on the development channel; production and preview builds embed
  no-op stubs (tightened from dev/preview in the round-4 self-audit — see R4.9).

## 8. Webflow API authentication

Doc: [Authentication](https://developers.webflow.com/data/reference/authentication).

- Webflow access tokens live only in Tower's Postgres, keyed per workspace + app. The extension
  calls Tower's authenticated proxy (`/api/v2/webflow/...`), which attaches the stored bearer on
  the outbound request only; no code path returns a Webflow token to any client.
- **Hardened:** stored OAuth tokens are now encrypted at rest with AES-256-GCM
  (`apps/tower/src/server/security/secret-encryption.ts`), lazy-migrating legacy plaintext rows on
  next write. Undecryptable values are treated as absent (reconnect required), never partially
  used. **Deploy prerequisite:** set `TOWER_TOKEN_ENCRYPTION_KEY` (32-byte base64,
  `openssl rand -base64 32`) in Vercel; without it, storage falls back to plaintext with a
  production warning.
- Revoked tokens are pruned and the workspace is prompted to reconnect (Webflow issues no refresh
  tokens for this flow).

## 9. Webflow site metadata

Doc: [Get site information](https://developers.webflow.com/designer/reference/get-site-info).

- `getSiteInfo()` fields used in telemetry are limited to site/workspace identifiers + names for
  PostHog grouping; now disclosed in the in-app Privacy section (item 3) and disabled entirely by
  the opt-out toggle.

## 10. Extension sizing

Doc: [Resize extension](https://developers.webflow.com/designer/reference/resize-extension).

- Single `setExtensionSize({ width: 350, height: 800 })` call on boot — within the documented
  custom limits (min 240×360, max 1200×800). No runtime resizing beyond that call.
- **Fixed in round 2:** the manifest `size` value now uses the documented `"comfortable"` keyword
  (see Round 2, item 2).

---

## Round 2 — 2026-07-09 follow-up flags

### R2.1 Development artifact in manifest (`telemetry` object)

- **Fixed:** the `telemetry` block (written into `webflow.json` by the `webflow` CLI's own
  consent storage — a local dev artifact, never an app setting) is removed from
  `apps/beacon/webflow.json` (and `apps/flint/webflow.json`). The manifest now contains only
  documented properties: `name`, `publicDir`, `size`, `apiVersion`.
- **Guarded:** `scripts/build-cli.mjs` now strips undocumented manifest keys immediately before
  `webflow extension bundle` and re-verifies the `webflow.json` inside the archived zip
  (`sanitizeWebflowManifest` / `verifyArchivedManifest`), so the artifact cannot ship again even
  if the CLI rewrites it locally. The bundle step also runs with `DO_NOT_TRACK=1`, which the
  Webflow CLI honors — it no longer writes its consent block into the manifest at all.
- **Guarded (release hygiene):** release-channel builds additionally assert the bundle contains
  no local dev values — any `VITE_*KEY/TOKEN/SECRET` value present in `.env`/`.env.local` and any
  localhost Tower origin fail the build if found in dist or the archived zip
  (`collectForbiddenBundleMarkers` / `verifyArchivedZipExcludes`).

### R2.2 Undocumented `size` value (`"custom"`)

- **Fixed:** `webflow.json` now declares `"size": "comfortable"` (a documented value). The
  existing `webflow.setExtensionSize({ width: 350, height: 800 })` boot call is unchanged and
  remains the effective panel size. The build guard above also rejects any undocumented `size`.

### R2.3 Default-on telemetry

- **Fixed — telemetry is now opt-in on first run.** PostHog and Sentry are not initialized at all
  (no network traffic, no SDK boot) until the user explicitly grants consent
  (`init-observability.ts` gates `Sentry.init`/`posthog.init` on stored consent).
- First run shows a consent dialog (`telemetry-consent-prompt.tsx`) disclosing exactly what is
  collected (error reports, feature-usage events, app version, site/workspace IDs) and naming the
  processors — PostHog (product analytics) and Sentry (error reporting). Choices: allow / decline;
  dismissing decides nothing and telemetry stays off.
- Consent is tri-state (`granted` / `denied` / undecided) in `telemetry-preference.ts`; the legacy
  opt-out flag from earlier builds is honored as an explicit denial. Undecided and malformed
  stored values are never treated as consent (unit-tested).
- Settings → Preferences → Privacy retains the toggle (now reflecting consent state) and the
  updated disclosure naming both processors. App-listing and privacy-policy copy should name
  PostHog and Sentry as processors and mirror the collected-fields list above.
- Every PostHog event registers `$geoip_disable: true`, suppressing PostHog's server-side GeoIP
  enrichment — no end-user location is derived or stored (Developer ToS §5.6(f); matches the
  in-app disclosure).

### R2.4 Regex-based HTML sanitizer in published-site runtime

- **Fixed:** the footer runtime's `bSafeHtml` is no longer regex string-rewriting. It now rebuilds
  rich-text fragments through a `DOMParser`-based allowlist sanitizer
  (`cms-slot-beacon-prop-runtime.ts`) mirroring the authoritative save-time sanitizer
  (`cms-slot-rich-text-html.ts`): same tag allowlist (p, br, strong, b, em, i, u, a, ul, ol, li,
  h2, h3, blockquote), subtree drops for script/style/iframe/object/etc., all attributes dropped
  except a scheme-checked `href` (+ hardened `target="_blank"`/`rel`) on anchors.
- Fail-closed: if DOM parsing is unavailable the value is written via `textContent`, never raw
  `innerHTML`.
- Additional hardening: the runtime's link and iframe/embed apply paths now reject non-navigational
  URL schemes (`javascript:`, `data:`, …) via the same `bSafeHref` allowlist.
- Defense-in-depth is two layers: values are sanitized at save time before entering the payload,
  and re-sanitized by the runtime before any `innerHTML` write.

### R2.5 CSP compatibility gap in blob popout

- **Fixed:** the compare popout no longer mints a `Blob` HTML document with inline `<script>`. It
  is now a static page shipped in the extension bundle (`public/quality-compare.html` + external
  `quality-compare.css` / `quality-compare.js`), opened same-origin — compatible with a strict CSP
  (`script-src 'self'`, no `blob:` document, no inline script or style attributes; unit-tested in
  `quality-compare-popout-page.test.ts`).
- Data flows over the existing origin-checked `postMessage` bridge: the page announces `ready`,
  the opener replies with an `init` message carrying the image Blobs (structured clone) and
  settings; the popout mints and revokes its own object URLs
  (`open-quality-compare-popout.ts`, `quality-popout-protocol.ts`).

---

## Round 3 — 2026-08 senior-engineer / review-team flags

### R3.1 Sentry SDK iframe creation in `init-observability` chunk

Flag: bundled Sentry browser SDK code creates hidden sandbox iframes
(`document.createElement("iframe")`) for fetch/native-API checks; iframes are only allowed in the
approved OAuth flow.

- **Fixed — Sentry is removed from the Designer Extension bundle entirely.** `@sentry/react` is no
  longer a Beacon dependency; `init-observability.ts` initializes only PostHog. Error reporting
  moved to PostHog's iframe-free `capture_exceptions` (unhandled errors + rejections), which was
  already wired; `captureObservabilityException` now reports through PostHog only.
- Verified in the rebuilt production bundle: zero occurrences of `createElement("iframe")` (any
  quote style) across `dist/bundle.js` and `dist/assets/*.js`. The only remaining "sentry" strings
  are inert strings inside posthog-js: property names in its optional Sentry-integration shim, a
  `https://sentry.io/organizations/` URL **template** used only to format a display link property
  (never fetched), and the `sentryuptimebot` entry in its bot-detection UA list — no Sentry SDK
  code, no Sentry network endpoint, no iframe path.
- First-party code creates no iframes (unchanged since round 1); PostHog's iframe-bearing features
  (session recording, surveys, toolbar, external script loading) remain hard-disabled via
  `CODALYN_EXTENSION_POSTHOG_PRIVACY_OPTIONS`.

### R3.2 Telemetry disclosure + CSP allowlisting (PostHog / Sentry)

- Processors: **PostHog only** (product analytics + error reporting) after R3.1. In-app disclosure
  copy (first-run consent prompt and Settings → Privacy) updated to name PostHog as the single
  processor; app-listing/privacy-policy copy should match.
- Collected fields (unchanged, opt-in only): error reports (exception message/stack), explicit
  feature-usage events, app version/channel/build metadata, and Webflow site + workspace
  IDs/names from `webflow.getSiteInfo()` for grouping. GeoIP enrichment suppressed
  (`$geoip_disable: true`); no autocapture, pageviews, session recording, surveys, or persistent
  tracking identifiers (`persistence: "memory"`).
- Consent controls: opt-in first-run prompt; toggle in Settings → Privacy; opt-out applies
  immediately (`posthog.opt_out_capturing`). No SDK boot or network traffic before grant.
- **Telemetry endpoints for the CSP `connect-src` allowlist** (HTTPS only):
  - `https://us.i.posthog.com` — event/exception capture + feature flags
  - `https://us-assets.i.posthog.com` — remote-config JSON (still fetched with
    `disable_external_dependency_loading: true`; script loading stays blocked)
  - Sentry's `*.ingest.us.sentry.io` is no longer needed and should be dropped from any allowlist.
- Full non-telemetry `connect-src` inventory, for completeness: the Tower backend origin baked at
  build time (`https://tower.codalyn.app` prod / `https://tower-preview.codalyn.app` preview) and
  the Webflow-issued presigned asset-upload URL (S3; see R3.3 — now client-allowlisted). Beacon
  never calls `api.webflow.com` directly — all Data API traffic goes through Tower's
  authenticated proxy.

### R3.3 Hosted custom-code runtime (`runtime.js`) — confirmation

Confirmed against source (`cms-slot-page-inline-script.ts` and the fragment modules it inlines):

- **The published runtime makes zero network calls.** No fetch/XHR/beacon/WebSocket, no storage or
  cookie access, no `eval`/`new Function`, no dynamic script injection. It operates only on the
  DOM of the page it ships on: it renders Beacon CMS-slot content — cloning source-list rows into
  render targets and applying composed values to images (`src`/`srcset`/`<picture>`), sanitized
  rich text (DOMParser allowlist, R2.4), scheme-checked links, text, and visibility — then reveals
  the layout and strips designer placeholders. Debug HUD ships only on the development channel;
  production and preview embed no-op stubs (verified absent from the release bundle; pinned by a
  unit test — see R4.9).
- **Explicit user action:** installation runs only from the CMS Slots Install button or the Sync
  button; automatic re-syncs happen solely as side effects of other explicit user actions on
  already-installed pages (composer save, slot rename/delete). Nothing installs on app load.
- **Install/remove behavior:** applied as page-level footer custom code with marker attributes;
  registered via `POST /sites/{siteId}/registered_scripts/hosted` with an SRI SHA-384
  `integrityHash` computed from the exact uploaded source. Uninstall (offered when deleting the
  last slot list) strips the footer entries — matched by marker attribute and by registered-script
  id — and purges unreferenced `codalyn-beacon-runtime-*.js` assets. (The Data API exposes no
  delete for the registration record itself; the hosted asset and the page application are both
  removed.)
- **Hardened in this round:** the presigned asset-upload URL returned by Webflow's create-asset
  endpoint — the one call in the install flow that does not go through Tower's proxy — is now
  validated client-side before upload (`isAllowedAssetUploadUrl`: HTTPS + Webflow/AWS S3/
  website-files hosts only; unit-tested).

### R3.4 Server-driven redirect hook (`window.location.href = data.url`)

Flag: the bundled Better Auth client redirect hook assigns `window.location.href` from a backend
response without client-side validation.

- **Fixed:** Better Auth's built-in redirect fetch plugin is disabled
  (`disableDefaultFetchPlugins: true` in `tower-auth-client.ts`) and replaced with
  `allowlistedRedirectPlugin`, which honors `redirect: true` responses only when the URL passes
  `isTrustedRedirectUrl` — exact-origin match against the Tower backend this bundle was built for,
  or `https://webflow.com/oauth/authorize`. Everything else (other origins, subdomain/suffix
  lookalikes, non-HTTPS, `javascript:`, relative/malformed values) is dropped. Unit-tested
  (`trusted-redirect.test.ts`).
- Verified in the rebuilt bundle: the default `id:"redirect"` plugin is never registered — the
  inert plugin object still appears in the minified bundle text (better-auth does not tree-shake
  it), but the only reference is `disableDefaultFetchPlugins ? [] : [redirectPlugin]` and Beacon
  hard-codes `disableDefaultFetchPlugins: true`, so it is unreachable. The allowlisted
  replacement is present and registered. (No current Beacon flow returns `redirect: true`; the
  guard exists so any future one is origin-constrained by construction.)
- The existing OAuth popup allowlist (`isAllowedWebflowAuthorizeUrl`, round 1) is unchanged.

### R3.5 Runtime style injection under strict CSP

- All first-party CSS is static: Vite emits a single `styles.css` (`cssCodeSplit: false`) linked
  from `index.html`; the compare popout uses external `quality-compare.css`. No inline `<style>`
  blocks or `style=""` attributes in any shipped HTML.
- **Fixed:** `react-easy-crop` no longer injects a `<style>` tag at mount —
  `disableAutomaticStylesInjection` is set and its stylesheet is bundled statically into
  `styles.css`.
- **Superseded in round 4 (R4.1):** at the time of the round-3 response, two third-party
  injectors remained (`react-remove-scroll` via Radix, `vaul`) and the extension required
  `style-src 'self' 'unsafe-inline'`. That is no longer true — every injector has since been
  removed or rewritten to CSP-exempt CSSOM (see R4.1), so `'unsafe-inline'` is no longer needed.
  Unchanged: no external style origins, no `blob:`/`data:` styles, and `script-src 'self'` holds
  throughout (no inline scripts anywhere, unit-tested for the popout page).

### R3.6 Popup windows (Tower auth, Webflow OAuth, image compare) — gesture gating

- **Fixed:** the one non-gesture popup path is removed — the site-authorization gate no longer
  auto-opens the Webflow OAuth popup from a mount effect (`beacon-site-link-gate.tsx`); the popup
  now opens only from the explicit "Open Webflow authorization" button. All other `window.open`
  call sites were audited and already run inside click/select handlers (header menu items,
  settings/billing links, sign-in form links, connection indicator, quality-compare popout
  button).
- Popups open `about:blank` synchronously inside the gesture, then navigate only to allowlisted
  destinations (Tower origin routes/handoff, `https://webflow.com/oauth/authorize` via
  `isAllowedWebflowAuthorizeUrl`); the compare popout is a same-origin static page from the
  bundle.
- Popup blocking is handled without retries or error spam: a blocked auth popup resolves
  `popup_blocked` and simply leaves the button available; a blocked compare popout returns null
  and the editor stays fully usable inline.

### R3.7 postMessage hardening in the compare popout

- **Fixed:** the popout page (`public/quality-compare.js`) now requires
  `event.source === window.opener` (and a live `window.opener`) in addition to the exact
  same-origin check and the parent source marker before accepting any message. The parent side
  already required `event.source === popoutWindow` plus exact origin plus payload validation
  (`quality-popout-dispatch.ts`).
- No wildcard origins anywhere in the bridge: every `postMessage` (both directions) targets the
  explicit extension origin. Pinned by unit tests (`quality-compare-popout-page.test.ts`: opener
  source-check present, no `"*"` target, all posts to `TARGET_ORIGIN`).

---

## Round 4 — 2026-08-05 review-team flags

### R4.1 Runtime `<style>` injection / `dangerouslySetInnerHTML` styles (CSP compatibility)

Flag: `bundle.js`, `assets/badge-*.js`, and `assets/dropdown-menu-*.js` inject runtime `<style>`
tags and use `dangerouslySetInnerHTML` for UI-library styles.

- **Fixed — every UI-library style injector is removed from the bundle.** The injectors were four
  third-party libraries; each is now patched via pnpm `patchedDependencies` (see `/patches`):
  - **vaul 1.1.2** (drawer): module-scope `__insertCSS` + its 5 KB static CSS string removed; the
    CSS ships statically in `styles.css` (`src/styles/vendor-static.css`, including a fix for
    vaul's malformed `[data-vaul-handle-hitarea]:{` selector).
  - **@radix-ui/react-select 2.2.6** and **@radix-ui/react-scroll-area 1.2.10**: the viewport
    `<style dangerouslySetInnerHTML>` elements are removed; their two static scrollbar-hiding
    rules ship in `styles.css`.
  - **react-easy-crop 5.5.7**: the (already opted-out, dead) injector code and its CSS string
    literal are removed; its stylesheet was already statically bundled (R3.5).
  - **react-style-singleton 2.2.3** (the scroll-lock injector Radix Dialog/Menu/Select/Popover
    pull in via react-remove-scroll): rewritten to apply its genuinely dynamic scrollbar-gap
    styles through **constructable stylesheets** (`new CSSStyleSheet()` + `replaceSync` +
    `document.adoptedStyleSheets`). CSSOM stylesheets are not subject to CSP `style-src`, so the
    extension no longer needs `style-src 'unsafe-inline'` — all first-party and vendor CSS is
    either in the static `styles.css`/`quality-compare.css` files or applied via CSSOM.
- Verified in the rebuilt production bundle: zero `createElement("style")`/`` createElement(`style`) ``
  calls from UI libraries and zero style-carrying `dangerouslySetInnerHTML` across `bundle.js` and
  all `assets/*.js` chunks. In release (production/preview) bundles the only remaining textual
  matches are framework internals with no UI-library styles behind them: react-dom's renderer
  machinery for React 19's `<style precedence>` hoisting feature (never exercised — no
  first-party or library code renders such elements) and react-dom's property-name switch
  statements that merely compare against the string `"dangerouslySetInnerHTML"`; plus
  react-router's `ScrollRestoration` component (unused — nothing in Beacon renders it), which
  serializes a `<script>` (not a style). Development-channel builds additionally embed the debug
  HUD source for the published-site runtime, which is stubbed out of every release bundle
  (unit-tested; see R4.9) — always submit a production-channel build.

### R4.2 Direct DOM manipulation (`quality-compare.js`, bundle DOM/canvas)

- **Reduced to platform-required APIs and made declarative.** `public/quality-compare.js` no
  longer writes concrete style declarations: the two continuous values (compare-wipe position, per-image
  aspect ratio) flow into `quality-compare.css` as CSS custom properties via CSSOM
  `style.setProperty` (`--scrub`, `--stage-ar`); constant transforms moved fully into the
  stylesheet; error state was already a class toggle. What remains is inherent to a static page:
  `getElementById` lookups, `aria-valuenow`/`aria-valuetext` writes (the standard accessibility
  API for a custom slider), object-URL assignment to the two `<img>` elements (with revocation on
  `pagehide`/`beforeunload`), and `textContent` writes (never `innerHTML`).
- **Why this popout exists and why it uses DOM APIs:** it is a same-origin static page in a
  separate popup window for side-by-side image-quality comparison at a larger size than the
  Designer panel allows. It never touches the Designer document — the Designer Extension APIs do
  not apply inside a standalone popup; the page operates exclusively on its own three elements.
- Bundle-side DOM/canvas use (unchanged, all inside the extension's own iframe, never the
  Designer document): canvas cropping/encoding in the image editor (`crop-image.ts`,
  `encode-image-blob.ts`), an `<a download>` element for the guest-mode WebP export, and the
  save-time `DOMParser` allowlist sanitizer for rich text (R2.4). The `cloneNode`/`DOMParser`
  strings visible in `bundle.js` belong to the *generated* published-site runtime source
  (R3.3) — they execute on the published site, not in the Designer.

### R4.3 External image processing (AVIF via Tower)

- **Disclosed in-product at the point of use:** the file-type tooltip now reads that AVIF
  "sends the cropped image to Codalyn's Tower service over HTTPS for conversion; it is processed
  in memory and not stored," and Settings → Privacy carries the same disclosure. WebP is
  explicitly described as encoding entirely in the Designer.
- **User-initiated:** AVIF encoding happens only while the user has selected the AVIF file type
  (guest mode and the default use in-Designer WebP); deselecting AVIF stops all uploads.
  Preview re-encodes while AVIF is selected are debounced side effects of that explicit choice.
- **Privacy policy** (`https://tower.codalyn.app/privacy`, §1 "Beacon Designer Extension") now
  describes the exact data flow: image sent over HTTPS, converted in memory by `sharp`, returned
  in the response, never persisted; only operational metadata (account/workspace IDs, format,
  quality, sizes, dimensions, duration) is logged.

### R4.4 Telemetry and analytics disclosure

- Telemetry remains **opt-in only** (R2.3): no SDK boot or network traffic before explicit
  consent; toggle in Settings → Privacy.
- Disclosure copy (consent prompt, Settings → Privacy, privacy policy §1) now enumerates the
  exact fields including the site/workspace **names** used for PostHog grouping (previously
  summarized as "IDs"): error reports (message/stack), explicit feature-usage events, app
  version/channel/build metadata, site ID/name/short name, workspace ID/slug. Processor: PostHog
  only (post-R3.1). GeoIP enrichment stays suppressed.

### R4.5 Localhost / development references in production bundle

- **Fixed — release bundles now contain zero `localhost`/`127.0.0.1` strings.** Sources and
  remedies:
  - First-party dev-guidance message (`tower-reachability-error.ts`, Beacon and Flint): rewrote
    the check to protocol-based (`new URL(origin).protocol === "http:"`) — same behavior (any
    plain-HTTP origin is mixed content in the Designer), no host literals.
  - Vendor literals in dead-in-extension code paths — react-router's windowless URL base,
    better-auth's server-side proxy-header validation, posthog-js's cookie-domain probe (dead
    under `persistence: "memory"`) and `internal_or_test_user_hostname` config default — are
    compiled out by a build-time transform (`scripts/vite-strip-dev-host-literals.mjs`) with
    per-site justification comments. The transform **fails the release build** if a vendor
    upgrade reintroduces or moves such a literal.
  - The release build guard (`scripts/build-cli.mjs`) now forbids the bare substrings
    `localhost` and `127.0.0.1` (any scheme/port form) in dist and in the archived zip.

### R4.6 Placeholder domains in production bundle

- **Fixed — no URL-like placeholder values remain in shipped bundles.**
  - `https://beacon.tower.invalid` / `https://flint.tower.invalid` (better-auth needs *some*
    valid `baseURL` before Tower is configured): now a dev-only branch compiled out of release
    builds; a release build without a Tower origin fails loudly instead.
  - CMS publish-placeholder sentinels: the seeds are non-network by construction —
    `#codalyn-beacon-publish-placeholder` (fragment; link/url/video props) and the bare token
    `codalyn-beacon-publish-placeholder` (email props). The retired URL-like values from
    pre-release builds (`https://codalyn.beacon/publish-placeholder`,
    `placeholder@codalyn.invalid`) are removed entirely — the app has never shipped publicly, so
    no published site carries them and nothing recognizes or reconstructs them anywhere in the
    extension or the generated site runtime.
  - The build guard forbids `tower.invalid`, `codalyn.invalid`, and `codalyn.beacon/` in dist and
    the archived zip.

### R4.7 Popup and redirect behavior — reviewer context

All popups are user-gesture-gated and destination-allowlisted (established in R3.4/R3.6,
unchanged): auth/OAuth popups open only from explicit buttons and navigate only to the built-in
Tower origin or `https://webflow.com/oauth/authorize` (`isAllowedWebflowAuthorizeUrl`,
`isTrustedRedirectUrl`); the quality-compare popout is a same-origin static page from the bundle,
opened only from the "Pop out" button. No non-gesture popup paths exist.

### R4.8 Referrer handling

- **Fixed:** `save_referrer: false` added to the shared extension PostHog options
  (`CODALYN_EXTENSION_POSTHOG_PRIVACY_OPTIONS`) — referrer analytics are not used or disclosed,
  and the extension iframe's referrer could carry Designer context. This complements the existing
  `$geoip_disable`, memory-only persistence, and disabled autocapture/pageview capture.

### R4.9 Proactive self-audit against the full Marketplace Guidelines (2026-08-05)

Beyond the flagged items, the whole Beacon app was re-audited against every guideline section.
Additional hardening landed from that audit:

- **Credential/authentication fields** (Performance/Technical §4): the published-site runtime's
  `applyValue` now refuses to write into credential fields — `<input type="password">`,
  `type="hidden"`, and any input/textarea whose `autocomplete` indicates
  `current-password`/`new-password`/`one-time-code`/`username` are skipped entirely
  (`bIsCredentialField`, unit-tested). Slot bindings only ever reach nodes the app itself tagged
  in the Designer, and the runtime reads no user input anywhere; the deny-list guarantees even a
  mis-tagged credential field cannot be touched.
- **Keyboard shortcuts** (Design/Usability, Designer §2.5): the debug HUD — the only code with a
  document-level key listener (Ctrl/Cmd+Shift+D), and only ever on the *published site*, never in
  the extension — is now compiled to no-op stubs on **both** production and preview channels
  (previously preview kept it). Pinned by a unit test asserting non-development runtime source
  contains no HUD, no hotkey binder, and no `createElement("style")`. The extension UI itself has
  zero document/window-level key listeners; the remaining element-scoped handlers (arrow keys on
  the compare slider, Enter/Escape in dialogs) are the standard WCAG keyboard-accessibility
  patterns the Accessibility guideline requires.
- **Telemetry accuracy** (Privacy §4.2): the support/feedback analytics events previously
  attached the submitted email and message text — contradicting the "anonymous" disclosure. They
  now record only `kind`/`topic`/`signedIn`; the message body and reply email go exclusively to
  Tower's support endpoint (the disclosed support channel). The privacy policy additionally
  discloses signed-in settings sync (export defaults, crop presets, referenced page/collection
  identifiers and names).
- **Accessibility**: removed an `aria-describedby` override that disconnected tooltip text from
  the plan-access chips in Settings; compare-preview images gained descriptive `alt` text.
- Verified clean elsewhere: no `eval`/`new Function` in shipped code (the `new Function` calls
  live in unit tests that execute the generated runtime source — they are not bundled); no
  iframes; no global-variable pollution; no ads; no placeholder/test content in UI copy; no
  Webflow trademark misuse; manifest limited to documented keys; Storybook/test code excluded
  from the bundle; hosted runtime registered with SRI SHA-384 over a content-addressed, versioned
  URL and never mutated in place; uninstall removes the page-level footer script and purges
  unreferenced runtime assets (workspace-level app removal cannot run extension code — manual
  cleanup instructions are provided in-app and in the docs).

**Scope note:** this document and the audits cover **Beacon**. Flint is a separate, unsubmitted
extension; its telemetry is not yet consent-gated and it still bundles Sentry. All Beacon
round-2/3/4 fixes must be ported before any Flint submission.
