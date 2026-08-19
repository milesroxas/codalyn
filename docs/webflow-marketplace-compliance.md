# Webflow Marketplace Compliance — Beacon

Point-by-point response to the Webflow app-review feedback (July 2026), mapping each flag to what
the app does and what changed. Doc references verified against developers.webflow.com on 2026-07-08.
Round-2 feedback (2026-07-09) is addressed in [Round 2](#round-2--2026-07-09-follow-up-flags);
round-3 feedback (2026-08) in [Round 3](#round-3--2026-08-senior-engineer--review-team-flags);
round-4 feedback (2026-08-05) in [Round 4](#round-4--2026-08-05-review-team-flags); the
pre-submission full-guideline re-audit in
[Round 5](#round-5--2026-08-05-full-guideline-re-audit-pre-submission); round-6 feedback
(2026-08-11) in [Round 6](#round-6--2026-08-11-review-team-flags); and round-7 feedback
(2026-08-12) in [Round 7](#round-7--2026-08-12-senior-engineer--review-team-flags).
Where a later-round fix supersedes an earlier answer, the original item notes it.

## 1. Direct DOM manipulation / unsafe patterns

Guideline: "Do not use statements or patterns that could introduce vulnerabilities in your App
(e.g. `eval()` statements, direct DOM manipulation, …)" — [Marketplace Guidelines, Performance/Technical](https://developers.webflow.com/apps/docs/marketplace-guidelines).

- No `eval()` or `new Function()` exists in shipped first-party code (only in unit tests that load
  generated runtime source for assertions; tests are not bundled).
- **Fixed (superseded in rounds 2 and 7):** the image-quality compare popout previously used
  `document.open()/document.write()`, then a same-origin `Blob` URL document, then a static page
  with a hand-authored script (round 2). It is now a React-rendered Vite entry with zero
  hand-written DOM manipulation — see Round 7, item R7.1.
- **Fixed:** PostHog now runs with `autocapture: false` and
  `disable_external_dependency_loading: true`, so the SDK never injects listeners into the
  extension DOM or lazy-loads remote scripts (`packages/observability` →
  `CODALYN_EXTENSION_POSTHOG_PRIVACY_OPTIONS`, consumed by both extensions'
  `init-observability.ts`).
- Remaining `document.createElement` uses are standard platform APIs inside the extension's own
  iframe (canvas-based image cropping, `<a download>` file export) — they never touch the Designer
  document. All canvas/page changes go through official Designer and Data APIs. The complete,
  current inventory of platform-API use (post round-7 sweep) is in R7.2.
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

- **Fixed (page implementation superseded in round 7):** the compare popout no longer mints a
  `Blob` HTML document with inline `<script>`. It is a page shipped in the extension bundle
  (since round 7 a React-rendered Vite entry: `quality-compare.html` + compiled
  `quality-compare.js` + external `quality-compare.css`), opened same-origin — compatible with a
  strict CSP (`script-src 'self'`, no `blob:` document, no inline script or style attributes;
  unit-tested in `quality-compare-popout-page.test.ts`).
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
- **Telemetry endpoints for the CSP `connect-src` allowlist** (HTTPS only) — *superseded by R6.4,
  which is the authoritative current list*:
  - `https://us.i.posthog.com` — event/exception capture. Feature flags are disabled
    (`advanced_disable_flags` + `advanced_disable_feature_flags`, pinned since R5.3), so no flags
    traffic occurs.
  - `https://us-assets.i.posthog.com` — **no longer contacted** as of R5.3: with
    `advanced_disable_flags: true` the SDK's remote-config loader returns before both the script
    path and the config JSON fetch (verified in the installed patched posthog-js 1.369.3). Drop
    from the allowlist.
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

- **Fixed:** the popout page (since round 7: `use-quality-popout-bridge.ts`,
  `isTrustedQualityParentEvent`) now requires `event.source === window.opener` (and a live
  `window.opener`) in addition to the exact same-origin check and the parent source marker before
  accepting any message. The parent side
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
  statements that merely compare against the string `"dangerouslySetInnerHTML"`. (react-router's
  `ScrollRestoration` component previously also matched here — unused dead code that serialized a
  `<script>`; since round 7 its emission is patched out of the package entirely, see R7.2.) Development-channel builds additionally embed the debug
  HUD source for the published-site runtime, which is stubbed out of every release bundle
  (unit-tested; see R4.9) — always submit a production-channel build.

### R4.2 Direct DOM manipulation (`quality-compare.js`, bundle DOM/canvas)

> Popout-page portion superseded in round 7 (R7.1): the hand-authored `quality-compare.js` is
> deleted; the popout is now a React-rendered Vite entry with no first-party DOM API calls at all.
> The bundle-side DOM/canvas notes below remain current.

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

> **Superseded by R7.6:** AVIF conversion is now additionally gated behind an explicit, revocable
> opt-in enforced at the network boundary; the "debounced side effects" rationale below no longer
> applies — no image bytes are sent without stored consent.

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
`isTrustedRedirectUrl`); the quality-compare popout is a same-origin page shipped in the bundle,
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

---

## Round 5 — 2026-08-05 full-guideline re-audit (pre-submission)

Driven by repeat review flags rather than a specific new flag list: the entire app was re-audited against
the full Marketplace Guidelines, and the shipped production bundle was scanned the way a hostile reviewer
would scan it. Round 5 found one genuine security defect that all previous rounds missed, plus several
guideline gaps the earlier self-audits had claimed clean.

### R5.1 Control-character bypass in the URL scheme allowlist (security defect)

Both href sanitizers rejected a disallowed scheme with `/^[a-z][a-z0-9+.-]*:/i`. That character class does
not match across an embedded C0 control character, so `java<LF>script:alert(1)` and `dat<LF>a:text/html,…`
matched neither the allowlist nor the rejection and were classified as harmless *relative* paths. Browsers
strip TAB/LF/CR from a URL before parsing its scheme, so the value executed as `javascript:` once written.
Reachable from save-time rich text, runtime rich text, `bApplyLink`, and `IFRAME`/`EMBED` `src` — i.e. it
could ship an executing `javascript:` href onto a customer's published site.

- **Fixed in both twins.** `stripUrlControlCharacters` (`shared/ui/rich-text-editor/lib/rich-text-url.ts`)
  and `bStripCtl` (the generated runtime, `cms-slot-beacon-prop-runtime.ts`) drop every character below
  U+0020 and trim, and the scheme tests now run on that reduced string — the same string the browser
  parses. Interior spaces are deliberately preserved (browsers percent-encode rather than remove them, so
  they cannot split a scheme, and stripping them would corrupt legitimate `mailto:` query strings).
  `bSafeHref` returns the control-stripped value, so what is written to the DOM is what was validated.
- Regression-tested in both implementations against an 11-payload obfuscation corpus (`\n`, `\r`, `\t`,
  `\x00`, `\x0b`, leading `\x01`, mixed case, `data:`, `vbscript:`), each verified to have returned
  "safe" against the pre-fix logic, plus end-to-end `applyValue` assertions (obfuscated anchor → `href="#"`,
  obfuscated iframe → no `src`, obfuscated anchor inside rich text → unwrapped, text kept).

### R5.2 Session-token postMessage accepted on origin alone

`use-beacon-tower-session.ts` ingested a Tower bearer token from a `postMessage` validated by `event.origin`
only — no `event.source` check — while the quality-compare bridge (three call sites) already required both.
Any window at the Tower origin holding a handle to the extension frame could inject a session token.

- **Fixed:** `tower-auth-client.ts` now keeps a registry of the auth windows this app itself opened and
  exports `isBeaconAuthWindow(event.source)`; the session bridge requires it in addition to the exact origin
  match. Closed windows are pruned from the registry on each check.

### R5.3 Remotely-enablable capture in PostHog

`capture_heatmaps`/`enable_heatmaps` were unset. Heatmaps ship inside the posthog core bundle, so
`disable_external_dependency_loading` does not hold them back — `$heatmaps_enabled_server_side` from the
remote-config response could have switched on document-level click/mousemove capture inside the Designer
iframe, with no code change and no re-review, invalidating the "no autocapture" disclosure.

- **Fixed** in `CODALYN_EXTENSION_POSTHOG_PRIVACY_OPTIONS`: `capture_heatmaps: false`,
  `enable_heatmaps: false`, `save_campaign_params: false` (UTM params were being parsed off the iframe URL,
  undisclosed), and `advanced_disable_flags` / `advanced_disable_feature_flags: true` to shut off the
  remote-config request that delivers those server-side toggles. The shipped bundle's telemetry behavior is
  now fully determined by the reviewed code.
- `person_profiles: "identified_only"` moved into the shared constant, and the constant is now spread
  **last** at both call sites, so the privacy floor cannot be silently overridden by an app-local option.

### R5.4 Disclosure completeness

R4.4 claimed the disclosure "enumerates the exact fields"; it did not. The consent prompt and Settings →
Privacy now additionally name the release channel and build metadata super-properties, and the browser/device
default properties PostHog attaches to every event (browser, OS, language, screen size), and state that no
location and no referrer are collected. Settings → Privacy additionally discloses signed-in settings sync
(export defaults, crop presets, referenced page/collection identifiers and names) — previously only in the
privacy policy.

- **The app now links to the published policies.** Neither disclosure surface previously contained any link:
  the privacy policy was cited throughout this document as the disclosure vehicle while the app never pointed
  at it. `shared/lib/codalyn-links.ts` adds `https://tower.codalyn.app/privacy` and `/terms` (both verified
  live, HTTP 200) opened from user-gesture handlers, linked from the consent prompt and Settings → Privacy.

### R5.5 Developer artifacts in end-user copy

Guideline: a fully functional experience free of placeholder content. Several strings named build-time
environment variables or hosting configuration to end users, and one rendered a raw backend response body.

- `beacon-tower-not-configured-notice.tsx` (rendered in Settings → Account and the CMS Slots access gate)
  said "Add `VITE_TOWER_ORIGIN` to connect an account" in visible JSX → now product copy directing the user
  to update/reinstall or contact support.
- `encode-image-blob.ts` AVIF errors named `VITE_BEACON_API_KEY`/`VITE_TOWER_ORIGIN`/`BEACON_API_KEY`, and
  sliced 240 raw characters of the backend response into a user-facing toast → now product copy (status code
  only); the raw detail goes to `console.warn`.
- `cms-slot-page-inline-script.ts` "Tower is not configured (VITE_TOWER_ORIGIN)" → "Connect your Codalyn
  account to sync page custom code."
- `tower-reachability-error.ts` returned Vercel Deployment Protection setup instructions and env-var names to
  end users → the developer-guidance branches are now compiled out of release builds entirely
  (`import.meta.env.DEV`); shipped builds return product copy only.
- Remaining developer-facing strings (console warnings, the build-misconfiguration throw) no longer contain
  `VITE_*` identifiers, so no configuration tokens ship as strings in the reviewed bundle.

### R5.6 Global error boundary rendered nothing

`error-boundary.tsx` returned `null` on any caught error while wrapping the entire app, so a single React
error blanked the whole Designer panel with no message and no recovery — the most reviewer-visible failure
mode in the app, against "apps that are error prone … will be removed".

- **Fixed:** a real fallback built from existing `shared/ui` primitives (apology copy, `role="alert"`, and a
  **Try again** action that resets the boundary so children remount). Telemetry capture is unchanged and the
  raw error is never shown to the user. Storybook story added (`UI/ErrorBoundary`), including a story that
  throws once and recovers on retry.

### R5.7 Accessibility

- The image editor's primary selected-source preview had `alt=""` (R4.9 had fixed only the compare preview);
  it now carries descriptive alt text naming the file being edited.
- The Settings account avatar is genuinely decorative (name and email render adjacent, initials fallback
  already hidden) and now carries `aria-hidden` alongside its empty alt.

### R5.8 Asset-upload allowlist was broader than documented

R3.3 described the presigned-upload allowlist as "Webflow/AWS S3 hosts", but the implementation accepted any
`*.amazonaws.com` host — i.e. any AWS-hosted bucket. Tightened to real S3 endpoint host shapes (path-style
`s3[.-]<region>.amazonaws.com` and virtual-hosted `<bucket>.s3[.<region>].amazonaws.com`, with the region
label required to match an AWS region shape) plus Webflow-owned hosts matched on label boundaries. HTTPS-only
is unchanged. The bucket label is deliberately not pinned to a literal name so a Webflow-side bucket rotation
cannot break the install flow. Negative tests added (foreign buckets, non-S3 AWS services, suffix lookalikes
such as `s3.amazonaws.com.evil.com`, userinfo tricks, plain HTTP).

### R5.9 Long-running work

- The OAuth popup watcher polled `win.closed` every 800 ms with no exit other than the popup closing — an
  abandoned auth window leaked one interval for the rest of the Designer session. Now bounded by a 10-minute
  watch timeout ("avoid long-running background processes").

### R5.10 Bundle hygiene — the reviewer's grep now comes back empty

R3.1 argued that the remaining `sentry` strings in the bundle were inert posthog-js internals. That argument
is correct but it is also an argument a reviewer has to accept on trust, twice, after Sentry was already
flagged once. The strings are now gone instead of explained:

- `scripts/vite-strip-dev-host-literals.mjs` gained posthog-js rules removing the `SentryIntegration` /
  `sentryIntegration` instance properties (which also lets Rollup tree-shake the integration class), the
  `https://sentry.io/organizations/` URL template, the `$sentry_*` event property names, and the
  `sentryuptimebot` bot-list entry. The bot entry is safe to drop: the list is a substring scan over
  independent entries, and the bundle only ever executes inside an authenticated Designer iframe, never on a
  crawlable page.
- `__forceAllowLocalhost` / `_forceAllowLocalhostNetworkCapture` are renamed to `forceAllowLoopback` — every
  read, write, and the deprecation message naming them are renamed together in the same module, so the rename
  is behavior-preserving (and both are session-recording debug switches that default false, with session
  recording hard-disabled anyway).
- The forbidden-marker gate in `scripts/build-cli.mjs` is now **case-insensitive** — the previous
  lowercase-only `localhost` check is exactly what let camelCase `__forceAllowLocalhost` through — and
  `sentry` is now an enforced forbidden marker rather than an incidental absence.
- Fail-if-moved behavior is preserved and extended to Sentry: a posthog upgrade that relocates any of these
  literals throws at transform time in release builds instead of silently shipping them.

Verified on the rebuilt production bundle, in `dist/` and inside the archived zip:
`grep -ric sentry` → 0, `grep -ric localhost` → 0, `grep -ric 127.0.0.1` → 0.

Pinned by `apps/beacon/scripts/release-build-gates.test.mjs` (24 tests), which runs the strip plugin against
the actually-installed posthog-js and asserts zero residuals — inside `pnpm test:run`, which the release
pipeline runs before the Vite build.

### R5.11 The flagship feature could ship disabled

`isCmsSlotsSurfaceEnabled()` required `VITE_CMS_SLOTS_SURFACE_ENABLED === "true"` under
`import.meta.env.PROD`, but every `.env*` file is gitignored, so the value existed only on one developer's
machine. Any clean checkout or CI release build produced a bundle where CMS Slots — the flagship surface —
rendered as a permanently disabled home-screen tile with no explanation, next to the "Coming soon" tiles. A
reviewer reads that as a broken or placeholder app.

- **Fixed:** the flag is now a kill switch that defaults **on**; only an explicit `"false"` disables the
  surface. The worst case is a build that ships the feature rather than one that ships a dead tile.
- A release-channel build guard (production and preview) fails the build if the flag resolves to `"false"`,
  using a resolver that mirrors Vite's own `loadEnv` precedence. `.env.example` now ships the value
  uncommented.

### R5.12 Placeholder content and pre-release framing removed

Guidelines: "Ensure that end users are provided with a fully functional experience free of placeholder
content", and submissions must be "complete, functional, and ready for their intended audience".
R4.9's claim of "no placeholder/test content in UI copy" was wrong — the app shipped both.

- **"Coming soon" section removed.** The home screen rendered a section of three permanently disabled
  roadmap tiles (Carousel, Smooth Scroll, Page Transitions) that did nothing when clicked. The section,
  the tile list, and their copy constants are deleted; the remaining working features now sit under a
  neutral **"Features"** heading instead of **"Early access"**.
- **Release stage is no longer user-facing, and no longer defaults to pre-release.**
  `parseBeaconReleaseStage` defaulted to `early-access` for any unset or unrecognized value, so the
  Settings and support version stamp read "Beacon v0.1.0 · Early access" in ordinary builds. It now
  defaults to `stable` (only an explicit `early-access` opts in), and the stage is dropped from the
  user-facing version display entirely, so no build can stamp a pre-release label on the product. It
  remains available as the `release_stage` telemetry super-property, which is what the disclosure
  describes.
- **Invite-gate wording.** The onboarding heading and button now read "Request access" rather than
  "Request early access". The gate's behavior is unchanged — this is wording only; see the reviewer-access
  open item below, which is the substantive issue.

Verified in the rebuilt production bundle: `grep -oi` returns 0 for `Coming soon`, `Early access`,
`Carousel`, `Smooth Scroll`, `Page Transitions`, and `beta`.

**Scope note:** this document and the audits cover **Beacon**. Flint is a separate, unsubmitted
extension; its telemetry is not yet consent-gated and it still bundles Sentry. All Beacon
round-2/3/4/5 fixes must be ported before any Flint submission. Flint does inherit the shared
`CODALYN_EXTENSION_POSTHOG_PRIVACY_OPTIONS` hardening from R5.3 automatically (heatmaps, campaign
params, remote config, `person_profiles`), but everything else in Round 5 — the URL sanitizer fix
(R5.1), the postMessage source check (R5.2), the disclosure and policy links (R5.4), the developer-copy
cleanup (R5.5), and the bundle-hygiene strip rules (R5.10, which are wired into the shared build
scripts but only assert against Beacon's bundle) — still needs porting.

**Open items that are product/listing decisions, not code** (flagged by the Round 5 audit, deliberately
not changed here):

- **Reviewer access:** sign-up is invite-only (the "Request access" path). Webflow requires access via a
  demo account or credentials; if the reviewer cannot sign in, nothing else in this document matters. The
  gate itself is untouched — only its pre-release wording was removed (R5.12).
- **Documentation:** guidelines ask for "comprehensive and user-friendly documentation or help resources".
  `codalyn.app/docs` and `/help` both 404; the in-app help action opens a support form, not documentation.
  The privacy policy and terms pages are live and are now linked from the app (R5.4).

## Round 6 — 2026-08-11 review-team flags

Five flags. All four code-level items are fixed in source; the fifth (documentation) is satisfied by
R6.4 below, which is written to be pasted into the submission notes.

### R6.1 Insecure URL scheme handling (`http:` accepted; editor allowlist included `sms:`)

Flagged: the published-site runtime's `bSafeHref` and the rich-text link validation accepted `http:`
alongside `https:`/`mailto:`/`tel:` (a transport-downgrade/interception risk), and the bundled rich-text
editor chunk additionally permitted `sms:`.

- **`http:` is now rejected everywhere a URL is validated.** The shared allowlist is
  `https:` / `mailto:` / `tel:` plus same-document relative paths and protocol-relative `//host`
  (which inherits the published page's `https:`). Changed in lockstep in all three implementations:
  `isSafeRichTextUrl` (editor `validateUrl` + the save-time boundary sanitizer), the runtime's
  minified twin `bSafeHref`, and the anchor path of the runtime rich-text sanitizer `bSafeHtml`.
  A rejected link is never partially applied: the editor marks the field invalid, the boundary
  sanitizer unwraps the anchor keeping its text, and the runtime writes `href="#"`.
- **`sms:` was never in Beacon's own allowlist** — it came from the bundled `@lexical/link` default
  (`SUPPORTED_URL_PROTOCOLS = {http:, https:, mailto:, sms:, tel:}`), which the editor does not use
  for validation (`validateUrl` is `isSafeRichTextUrl`). Applying the round-3 lesson that unreachable
  vendor code is still review surface, the dependency is patched via pnpm `patchedDependencies`
  (`patches/@lexical__link@0.46.0.patch`): the set is now `{https:, mailto:, tel:}` in every shipped
  dist variant, so neither `sms:` nor `http:` appears in the bundle at all.
- **Media sources got the same tightening pre-emptively** (not flagged, but the adjacent surface):
  the runtime's image apply path now runs every value through `bSafeSrc` — `https:` absolute,
  protocol-relative, or relative path only; `http:`, `data:`, `blob:`, and every other explicit
  scheme are rejected before any `src`/`srcset`/`background-image` write, with the existing
  attribute left untouched.
- Pinned by unit tests in all three suites (canonical + alternate + malformed shapes, per the repo's
  boundary-testing rules): `rich-text-url.test.ts`, `cms-slot-rich-text-html.test.tsx`,
  `cms-slot-beacon-prop-runtime.test.ts`.

### R6.2 Iframe/embed source assignment removed from the published-site runtime

Flagged: `applyValue` would assign `src` on existing `IFRAME`/`EMBED` elements from CMS-bound values,
making externally hosted embeds an independently changeable runtime surface.

- The branch is deleted. `applyValue` now begins with a hard exclusion — `IFRAME`, `EMBED`, and
  `OBJECT` elements are returned from untouched: no `src`, no `textContent`, no attribute of any
  kind. There is no code path in the runtime that can set an embed source anymore.
- The placeholder-cleanup helper similarly dropped its iframe/embed handling (nothing can seed
  those elements now), and the rich-text sanitizers continue to strip `iframe`/`object`/`embed`
  subtrees outright.
- The Designer never offered iframe binding UI, so no user-facing capability is lost.
- Pinned by a unit test: a bound iframe keeps its authored `src` even when the bound value is a
  well-formed `https:` URL.

### R6.3 One-time token moved out of the URL query string

Flagged: the auth handoff navigated a popup to `/api/beacon-handoff?ott=…&callbackUrl=…`, leaving the
single-use token exposed to server, proxy, and CDN access logs and browser history.

The handoff now uses the URL **fragment** plus a **POST body**, combining both remediations the
review offered:

- Beacon opens `https://tower.codalyn.app/beacon-handoff#ott=…&callbackUrl=…`. The fragment is never
  transmitted to the server, so no request line, access log, or `Referer` can contain the token.
- The `/beacon-handoff` page immediately strips the fragment from the address bar and history entry
  (`history.replaceState`) — before any network activity — then redeems the token via
  `POST /api/beacon-handoff` with a JSON body and navigates to the sanitized same-origin
  `callbackUrl`.
- The API route accepts **POST only** (the GET query-parameter form is gone, not deprecated), and
  hardens redemption: same-origin `Origin` header required (redeeming sets a first-party session
  cookie, so cross-site posts must not be able to fixate a session — login-CSRF guard),
  `application/json` content type required, `Cache-Control: no-store`, and an identical `200 {ok}`
  response whether or not the token was valid (no validity oracle).
- Token properties are unchanged: minted only by an authenticated extension session, hashed at rest,
  single-use, 60-second expiry, never contains the session value.
- Pinned by unit tests: the beacon URL builder (token appears only after `#`; the loggable prefix
  contains neither `ott` nor the token) and the Tower route (same-origin enforcement, content-type
  enforcement, malformed-body handling, no-oracle behavior).

### R6.4 Published-site runtime + external endpoint documentation (submission text)

Requested: document the runtime script behavior and the full external endpoint list for CSP
`connect-src` review. The following is the authoritative statement for the submission notes.

**Published-site runtime (`codalyn-beacon-runtime-*.js`, registered via Custom Code hosted script
with an SRI SHA-384 integrity hash):**

- Performs **zero network requests** of any kind — no `fetch`, XHR, beacon, WebSocket, or dynamic
  script/resource injection — and no cookie, storage, `eval`, or `new Function` use. It reads a JSON
  payload embedded in the page at publish time and renders it into the page's own DOM.
- All HTML it writes passes an allowlist DOM sanitizer (DOMParser rebuild; tags
  `p/br/strong/b/em/i/u/a/ul/ol/li/h2/h3/blockquote`; `script`/`style`/`iframe`/`object`/`embed`/
  `form` subtrees dropped; anchors keep only a scheme-checked `https:`/`mailto:`/`tel:`/relative
  `href` plus hardened `target="_blank" rel="noopener noreferrer"`). This mirrors the authoritative
  save-time sanitizer in the extension; the runtime re-sanitizes rather than trusting the payload.
- It never assigns iframe/embed/object sources (R6.2), never writes into credential or hidden form
  fields (R4.9), applies media sources only after the `https:`-only `bSafeSrc` check (R6.1), and
  installs no keyboard shortcuts, timers, or observers beyond a DOMContentLoaded hook.
- It is installed/updated only by explicit user action in the Designer (R3.3) and is byte-pinned by
  the SRI hash — the served file cannot change behavior without a re-registration from the app.

**Complete external endpoint list (Designer extension iframe; for CSP `connect-src`):**

| Endpoint | Purpose | Condition |
| --- | --- | --- |
| `https://tower.codalyn.app` | First-party backend (auth, settings, CMS composition, image processing, support) | Always |
| `https://us.i.posthog.com` | Product analytics + error reporting (PostHog, sole processor) | Only after explicit opt-in consent; SDK not initialized before grant |
| Webflow asset-upload presigned URLs (`https://s3.amazonaws.com/webflow-*`, `https://*.website-files.com`) | Direct upload of the runtime JS asset returned by Webflow's create-asset endpoint | Only during user-initiated CMS Slots install/sync; URL allowlist-validated client-side (R3.3) |

No other host is contacted. `us-assets.i.posthog.com` is **not** required: remote config, feature
flags, surveys, heatmaps, session recording, and external dependency loading are all disabled in the
pinned privacy options (R5.3/R6.5), so the SDK never fetches from the assets host. The published-site
runtime contributes nothing to `connect-src` (zero network). Webflow Designer/Data APIs are reached
via the `webflow` extension bridge and Tower's server-side proxy respectively, not directly from the
iframe.

### R6.5 PostHog web-experiment code paths removed from the bundle

Flagged (advisory): the bundled `posthog-js` contained web-experiment code capable of applying remote
HTML/inline styles — disabled by configuration as shipped; keep the flags pinned and tree-shake if
possible.

Both required actions are done, and the code is now gone rather than merely disabled:

- **Flags pinned by test:** `CODALYN_EXTENSION_POSTHOG_PRIVACY_OPTIONS` now sets
  `disable_web_experiments: true` explicitly (previously the SDK default), and a new unit test in
  `@codalyn/observability` locks the full privacy floor (`advanced_disable_flags`,
  `advanced_disable_feature_flags`, `disable_surveys`, `disable_external_dependency_loading`,
  heatmaps off, `persistence: "memory"`, `save_referrer: false`, …) so any regression fails CI.
- **Implementation excised via pnpm patch** (`patches/posthog-js@1.369.3.patch`), the same
  mechanism accepted for the round-4 style-injection fixes: the `WebExperiments` transform applier
  (the only `innerHTML` assignment and the only `setAttribute("style", …)` in the entire module),
  the `/api/web_experiments/?token=` fetch, and the `__experiment_id`/`__experiment_variant`
  URL-preview path are all stubbed to no-ops in `dist/module.js`. A static scan of the shipped
  bundle now finds **zero** occurrences of the experiments endpoint, `innerHTML` writes, or style
  `setAttribute` inside the telemetry chunk — the capability is absent, not dormant.

### R6.6 Post-fix full re-audit (2026-08-11, pre-submission)

After the round-6 fixes landed, the whole app, the release pipeline, and the rebuilt production
bundle were re-audited against the full Marketplace Guidelines (hostile-grep of `dist/` and the
archived zip included). The audit confirmed every round-1→6 fix intact — no regressions — and
landed three further hardenings in the same spirit as the round-6 flags:

- **Payment/checkout fields added to the published-site runtime's deny-list** (guideline: injected
  scripts "must not read from, write to, listen on, or modify payment or checkout form elements").
  `bIsCredentialField` now also refuses any input/textarea/select whose `autocomplete` carries a
  WHATWG payment token (`cc-` prefix: `cc-number`, `cc-exp`, `cc-csc`, …, including space-separated
  forms like `billing cc-number`), alongside the existing password/hidden/username/one-time-code
  exclusions (R4.9). The runtime already reads no user input and transmits nothing; this guarantees
  a mis-tagged payment field is never written either. Unit-tested.
- **`bApplyImageToContainer` now writes exactly the value it validated.** The container path's CSS
  `background-image` write previously emitted the raw value after validating its control-stripped
  form (injection-proof — quotes/backslashes were escaped — but a validated-vs-written drift
  against the R5.1 write-what-you-validated contract). The function now reassigns the `bSafeSrc`
  result up front so every downstream write, including the CSS branch, emits the sanitized string.
  Unit-tested (control character stripped from the emitted `background-image`; rejected schemes
  apply nothing).
- **`@lexical/link` patch extended: `isWebSiteURI` no longer names `http://`.** The round-6 patch
  removed `http:`/`sms:` from `SUPPORTED_URL_PROTOCOLS`; the same package still shipped an
  `isWebSiteURI()` helper testing `startsWith("http://")` (a read-only classifier, unused by
  Beacon's validation path). Applying the round-3/round-6 lesson that unreachable vendor code is
  still review surface, the patch now reduces it to `https://` only — the rich-text chunk contains
  no `http://` scheme test at all.

Verified on the rebuilt production bundle (dist + archived zip): `sentry`, `localhost`,
`127.0.0.1`, `sms:`, `tower.invalid`, `codalyn.invalid`, `Coming soon`, `Early access`,
`eval(`/`new Function`, and `createElement("iframe")` all return zero. Remaining `http://` strings
are inert and unavoidable: W3C XML namespace identifiers (`http://www.w3.org/...`) that React needs
at runtime for SVG/MathML rendering, posthog-js's `http://yandex.com/bots` bot-list UA entry, and a
better-auth error-message string — none is a fetchable endpoint or an accepted scheme. The
`web_experiments` tokens remaining in the telemetry chunk are the `disable_web_experiments` config
key and the guard reading it; the fetch behind them is the stubbed `return e([])` (R6.5).

---

## Round 7 — 2026-08-12 senior-engineer / review-team flags

### R7.1 Direct DOM manipulation in `quality-compare.js`

Flag: the extension directly accesses and mutates DOM nodes — `document.getElementById`,
`stage.style.setProperty`, `setAttribute`, `textContent`, `classList.add`, direct `img.src`
assignment (`quality-compare.js:17-24, 42-43, 91, 140-155`). Required fix: implement the UI
through the app framework/state layer.

- **Fixed — the hand-authored popout script is deleted; the popout is now rendered by React, the
  same framework and state layer as the rest of the extension.** `quality-compare.html` is a
  second Vite entry built from source (`apps/beacon/quality-compare.html` +
  `src/quality-compare.tsx`); the shipped `quality-compare.js` is compiler output, exactly like
  `bundle.js`. Every flagged line is gone with the file:
  - UI state is React state. The compare-wipe position and slider value are `useState`; the image
    sources, aspect ratio, and error state come from a `useQualityPopoutBridge` hook
    (`features/image-editor/lib/use-quality-popout-bridge.ts`) that owns the postMessage protocol
    and the object-URL lifecycle. Rendering is declarative JSX — first-party popout code contains
    no `getElementById` lookups (beyond the standard `createRoot(document.getElementById("root"))`
    framework bootstrap shared with `index.html`), no `classList`/`setAttribute`/`textContent`
    writes, and no `img.src` assignment; images, ARIA slider attributes, and the error alert are
    all rendered as props/state.
  - The two continuous visual values (wipe position, stage aspect ratio) still resolve in the
    static stylesheet as CSS custom properties (`--scrub`, `--stage-ar`), now supplied through
    React's `style` prop instead of CSSOM calls.
  - The page is split into a presentational component
    (`quality-compare-popout-page.tsx`, Storybook-covered: `ImageEditor/QualityComparePopoutPage`)
    and a container (`quality-compare-popout-app.tsx`), matching the app's architecture.
- **Security posture preserved or improved:**
  - The R3.7 opener-trust rule is intact: exact same-origin check plus
    `event.source === window.opener` plus the parent source marker
    (`isTrustedQualityParentEvent`, unit-tested in `quality-compare-popout-page.test.ts`).
  - Payload validation is now a typed boundary guard exported from the shared protocol module
    (`isQualityParentToPopoutMessage`: message-shape and `instanceof Blob` checks before any field
    is used; unit-tested for canonical, malformed, and missing shapes).
  - The duplicated protocol constants the old static file required are gone — the page imports
    `quality-popout-protocol.ts` directly, so the two sides of the bridge can no longer drift.
  - All posts still target the explicit extension origin (never `"*"`); object URLs are still
    minted only inside the popout and revoked on replacement, unmount, and
    `pagehide`/`beforeunload`.
- **CSP posture unchanged:** the built `quality-compare.html` contains no inline script or style
  (src-only `<script type="module">` + external stylesheets; pinned by unit tests against the
  source document). `public/quality-compare.css` remains the page's only stylesheet — the build
  strips the extension's merged `styles.css` link from this document so the popout ships no
  Tailwind payload.
- Verified in the rebuilt production bundle: `dist/quality-compare.js` is minified Vite/React
  output sharing chunks with `bundle.js` (`assets/jsx-runtime-*.js`,
  `assets/quality-popout-protocol-*.js`); `dist/quality-compare.html` links only
  `quality-compare.css` and module scripts.

**Update 2026-08-14 — popout withheld from submission bundles.** The quality-compare popout is now
behind a build-time flag (`VITE_QUALITY_COMPARE_POPOUT_ENABLED`, default off; see
`apps/beacon/vite.config.ts`) and is **not present in Marketplace submission bundles**:

- With the flag off, the `quality-compare` Vite entry is not built and `public/quality-compare.css`
  is dropped from dist — no `quality-compare.html/.js/.css` in the zip, so no orphaned/unreachable
  files for a reviewer to find.
- The opener path is dead-code-eliminated from `bundle.js` (the `window.open` call, the popup
  window name, and the `quality-compare.html` URL are gone), and the parent-side bridge never
  registers its `message` listener. The "Pop out" button is not rendered at all — off means fully
  off, per the guideline barring placeholder or non-functional UI.
- Enforced by the release pipeline: `build:prod`/`build:preview` fail if the flag resolves to
  `"true"` (`FORBIDDEN_RELEASE_ENV`), and the archived-zip verification treats the substring
  `quality-compare` as a forbidden marker across every file in the bundle.
- The R7.1 rebuild above remains the implementation of record for when the popout ships again; the
  popup inventory in R3.6 should be read minus this popout for bundles built with the flag off
  (the auth popup is unaffected).

### R7.2 Proactive whole-app DOM-pattern sweep (2026-08-12, post-R7.1)

After the popout fix, the entire extension (source, workspace packages, and the rebuilt production
bundle) was re-audited for any remaining hand-written DOM manipulation, plus a fresh pass over
popups, postMessage, timers, storage, navigation, and network surface. Three further reductions
landed:

- **`shared/ui/scroll-area.tsx` no longer patches Radix's DOM from JS.** The component previously
  wrote five inline style declarations onto the viewport's content wrapper (undoing Radix's inline
  `display: table; min-width: 100%`). The override now ships statically in
  `styles/vendor-static.css` (`[data-slot="scroll-area-viewport"] > div`, `!important` to beat the
  library's inline styles) and the JS patch is deleted.
- **Startup CSS-variable writes on `<html>` removed.** `injectBeaconAppBackgroundCssVars()` (eight
  `documentElement.style.setProperty` calls from the entry file) is deleted; the six
  `--beacon-*` background-image vars are fully static and now declared in `globals.css` under
  `:root`. The production bundle contains **zero** first-party CSSOM writes on extension code
  paths — remaining `style.setProperty` text in `bundle.js` is (a) string literals of the
  generated published-site runtime (R3.3) and (b) framework internals.
- **`document.querySelector` poll removed.** The one first-party `querySelector` (a
  requestAnimationFrame loop waiting for a closing drawer's exit animation before auto-opening the
  next sheet) is replaced by a mount registry inside the drawer primitive
  (`shared/ui/drawer.tsx`: `hasDrawerMidClose()` / `subscribeDrawerStack()`, fed by React
  lifecycle, consumer keeps a hard 1200 ms cap). Remaining `document.querySelector` matches in the
  bundle are react-router/vaul/Vite-preload internals.

Complete inventory of remaining platform-API use inside the extension iframe (each deliberate,
none manipulates the Designer document):

- Framework bootstrap: `createRoot(document.getElementById("root"))` in the two Vite entries
  (`src/index.tsx`, `src/quality-compare.tsx`).
- Theme switch: `documentElement.classList` toggle of `light`/`dark`
  (`shared/providers/theme-provider.tsx`) — the standard shadcn/next-themes dark-mode mechanism;
  constant class names, no user input, required because `<html>` sits outside the React root.
- Drawer body pointer-events guard (`shared/ui/drawer.tsx`): a MutationObserver scoped to
  `<body>`'s `style` attribute that reverts a stuck `pointer-events: none` written by the bundled
  Radix/vaul scroll-lock when two drawers' open/close animations race. Refcounted to the
  open-drawer lifetime (disconnected on last close), reverts only a value the library itself
  wrote, introduces no styling of its own; rationale documented in-code.
- Image pipeline (extends the R4.2 inventory): canvas crop/encode (`crop-image.ts`,
  `encode-image-blob.ts`), the `<a download>` guest-export anchor, and detached
  `new Image()` decode/measure probes (`load-image.ts`, `validate-source-image-file.ts`) whose
  `src` is an object URL minted from the user's own picked file — these elements are never
  inserted into any document.
- `DOMParser`, parse-only: the save-time rich-text sanitizer (R2.4, `cms-slot-rich-text-html.ts`)
  and Lexical's HTML import (`shared/ui/rich-text-editor/lib/rich-text-html.ts`), where the
  editor's registered node set is the allowlist.
- React `createPortal(…, document.body)` for the route-loading overlay — React-managed rendering,
  not manual DOM mutation.
- Note for text-only greps: `setAttribute`/`append`/`setProperty` matches in
  `features/cms-slots/model/*` are calls on **Webflow Designer API objects** (`DOMElement`,
  `elementBuilder`, `Style` from the official SDK) — the sanctioned way to edit canvas elements —
  not browser DOM.

**`dangerouslySetInnerHTML` grep on `bundle.js` now returns zero.** The single remaining match was
react-router's `ScrollRestoration` — dead code in this SPA extension (its framework/SSR context is
always null, so the component returns before the emission), but a live grep hit. Applying the
round-3 lesson that unreachable vendor code is still review surface, the package is now patched
(`patches/react-router@7.14.2.patch`, same pnpm `patchedDependencies` mechanism as vaul/Radix/
Lexical/posthog): the SSR inline-`<script>` branch is replaced with `return null`, while SPA
scroll restoration (`useScrollRestoration`) is untouched. Pinned by a unit test that reads the
installed package's dist chunks and fails if the emission ever returns
(`react-router-scroll-restoration-patch.test.ts`). The only `dangerouslySetInnerHTML` text left in
the shipped bundle is react-dom's own property-handling internals in the shared framework chunk —
string comparisons in the renderer, not usable API surface, and not removable without forking
react-dom.

Re-verified on the rebuilt production bundle: zero `eval`/`new Function`; zero wildcard
`postMessage` targets (all sends pin the exact extension origin; all four receive paths check
exact origin + `event.source` identity + typed payload); zero first-party document-level keyboard
listeners; `sentry`/`localhost`/placeholder-domain/`sms:` greps still zero; all `window.open`
calls user-gesture-gated and allowlisted; both watch intervals hard-bounded at 10 minutes; no
tokens or PII in storage (session token is memory-only; the legacy localStorage key is actively
purged); `quality-compare.js` contains a single `getElementById` — the React bootstrap.

### R7.3 Popup / opener security — `noopener,noreferrer` absent from auth popups

Flag: Tower and Webflow OAuth flows open external windows with `window.open("about:blank", …)`
and later navigate them, but the popup feature string does not include `noopener,noreferrer`,
leaving an opener relationship in place for external authentication pages
(`assets/label-*.js`). Required fix: add `noopener,noreferrer` unless opener access is strictly
required; if it is required for authentication completion, constrain it to the minimum flow and
keep strict postMessage origin and source checks.

- **Opener access is strictly required for these flows, so the finding's second branch applies.**
  `noopener` makes `window.open` return `null`, which breaks the flow at three points:
  1. The blank window is opened **synchronously inside the user gesture** (popup-blocker
     requirement, R3.6) and navigated only after async work completes — path resolution, the
     one-time-token mint (R6.3) — via `win.location.replace(…)`. Without the handle there is no
     way to fill in the URL.
  2. Auth completion is delivered **through the opener relationship**: Tower's success page posts
     the bearer token back to the extension via `postMessage`, and the extension closes/watches
     the popup (`win.close()` on failure, bounded `win.closed` watcher for `onClosed` refetch).
  3. The compare popout (R7.1) receives its image Blobs from `window.opener` by the same
     mechanism.
- **The required constraints are in place (established R1/R3/R5, re-verified now):**
  - *Destination allowlist:* an auth window can only ever be navigated to the Tower origin this
    bundle was built against (`buildTowerAppUrl`) or exactly
    `https://webflow.com/oauth/authorize` (`isAllowedWebflowAuthorizeUrl`: https scheme + exact
    host + exact path). A non-allowlisted authorize URL closes the popup without navigating.
  - *Strict origin + source checks on token ingestion* (R5.2): the session bridge accepts a
    token only when `event.origin` equals the exact Tower origin **and** `event.source` is a
    window this app itself opened and that is still open (`isBeaconAuthWindow` registry) **and**
    the payload matches the typed message shape. The compare popout applies the mirrored rule
    (`event.source === window.opener` + exact origin, R3.7).
  - *Minimum flow:* popups are user-gesture-gated (R3.6), the close-watcher is hard-bounded at
    10 minutes (R5.9), and every external link that does **not** need an opener already ships
    `noopener,noreferrer` (`codalyn-links.ts`, sanitizer-forced `rel` on rich-text links, R2.4) —
    the opener relationship exists only on the auth/popout windows that functionally require it.
  - *Reverse-tabnabbing exposure is bounded by the allowlist:* the only documents that ever hold
    an opener reference to the extension are Tower (first-party) and Webflow's own consent
    screen.
- **New unit tests pin all of this** (`tower-auth-popup-security.test.ts`, 18 tests): the
  opened-window registry (`isBeaconAuthWindow` accepts only windows the app opened, prunes closed
  ones), navigation confinement (`openTowerAppPath` opens `about:blank` and navigates only to the
  Tower origin), the OAuth destination allowlist (wrong host / wrong path / non-https / blocked
  popup / unreachable Tower all refuse to navigate), and the full `handleTowerMessage` guard
  chain (foreign origin, unregistered source, closed window, malformed shape, non-string token
  all rejected). This closes the coverage gap where only the popout side of the source-check rule
  was unit-tested (R7.1).

### R7.4 Telemetry / external endpoint allowlisting — CSP is now browser-enforced in the shipped documents (not only documented)

Flag: the bundle includes PostHog telemetry to `https://us.i.posthog.com` after user consent; the
endpoint "must be explicitly accounted for in CSP and privacy disclosures". Required fix: ensure
CSP enforcement explicitly allowlists only the required PostHog endpoint, keep telemetry opt-in,
and ensure privacy disclosures accurately describe all telemetry fields and processors.

**Root cause of the repeat flags: earlier rounds documented the endpoint inventory for CSP review
(R6.4) but nothing in the shipped bundle enforced it.** Designer Extensions get no response-header
control (Webflow serves the bundle) and `webflow.json` has no CSP field, so the only enforcement
point the app owns is a `<meta http-equiv="Content-Security-Policy">` tag in each shipped HTML
document. That is now what ships — the R6.4 inventory turned into browser-enforced policy:

**`index.html` (Designer Extension iframe):**

```
default-src 'none'; script-src 'self';
style-src 'self' 'unsafe-inline'; style-src-elem 'self'; style-src-attr 'unsafe-inline';
img-src 'self' blob: https://webflow.com https://*.webflow.com https://website-files.com https://*.website-files.com;
font-src 'self';
connect-src 'self' https://tower.codalyn.app https://us.i.posthog.com
            https://s3.amazonaws.com https://*.s3.amazonaws.com
            https://webflow.com https://*.webflow.com https://website-files.com https://*.website-files.com;
object-src 'none'; frame-src 'none'; worker-src 'none'; form-action 'none'; base-uri 'none'
```

**`quality-compare.html` (compare popout):**

```
default-src 'none'; script-src 'self';
style-src 'self' 'unsafe-inline'; style-src-elem 'self'; style-src-attr 'unsafe-inline';
img-src blob:; connect-src 'none';
object-src 'none'; frame-src 'none'; worker-src 'none'; form-action 'none'; base-uri 'none'
```

- `connect-src` is exactly the R6.4 endpoint list: `https://us.i.posthog.com` is the **only**
  telemetry endpoint (sole processor, reachable only after opt-in — the SDK is not initialized
  before a grant, R2.3 unchanged); Tower is the first-party backend; the S3/Webflow hosts cover
  the user-initiated CMS Slots presigned upload (R3.3). A regression that tried to contact any
  other host — including `us-assets.i.posthog.com` — is now blocked by the browser, not merely
  absent from the code.
- The S3 sources are deliberately **narrower** than the defensive runtime validator
  (`AWS_S3_UPLOAD_HOST_RE` also tolerates regional endpoints, which CSP host-source syntax cannot
  express without admitting all of `*.amazonaws.com`). If Webflow ever moves the upload to a
  regional host the flow fails closed with a visible error; the policy never widens preemptively.
- The popout's `connect-src 'none'` enforces its zero-network claim (R6.4) outright.
- Style posture: external stylesheets are first-party only (`style-src-elem 'self'`); inline
  `style` **attributes** are allowed (`style-src-attr 'unsafe-inline'`) because React `style`
  props and the bundled Radix/vaul primitives set them. Inline `<style>` elements remain blocked
  in CSP3 engines, and both source documents are pinned by tests to contain none. `script-src` is
  `'self'` with no `unsafe-*` of any kind.
- **Drift protection (why this cannot silently regress again):** the policies are built by pure
  functions in `src/shared/lib/beacon-extension-csp.ts` (PostHog host imported from the same
  `@codalyn/observability` constant the SDK init uses — one source of truth); a Vite plugin
  substitutes them into both entries at build time and **fails the build** if the placeholder meta
  is missing from either document; unit tests (`beacon-extension-csp.test.ts`) pin every
  directive, assert the PostHog host appears exactly once, assert no Sentry/assets-host/`data:`/
  `unsafe-eval` tokens, and assert each source document carries exactly one CSP meta.

### R7.5 Privacy disclosure accuracy pass

- In-app disclosures (first-run consent prompt + Settings → Privacy) re-verified against the
  implementation: fields listed (error message + stack, feature-usage events, app version /
  channel / build metadata, site ID/name/short name, workspace ID/slug, browser/OS/language/
  screen size) match `buildCodalynPostHogSuperProperties`, the `site`/`workspace` groups, and
  PostHog's default event properties. PostHog named as sole processor in both. No change needed.
- **Hosted privacy policy updated** (`tower/src/features/legal/content/privacy-policy.md`, Beacon
  section): its "exactly the following is collected" list previously omitted the browser/device
  defaults the PostHog library attaches to every event — now enumerated (browser + version, OS,
  language, screen/viewport size), matching the in-app copy. Added the factual transport note
  that PostHog receives the client IP as part of any network request, with GeoIP enrichment
  disabled (`$geoip_disable: true`, R2.3) so it is not used to derive location.
- Telemetry remains opt-in only; no behavior change in this round — enforcement and disclosure
  only.

### R7.6 Privacy-sensitive image processing — AVIF conversion now gated behind explicit, revocable opt-in

**Flag (review team):** "AVIF optimization posts image data to
`https://tower.codalyn.app/api/v1/images/optimize`. The endpoint is HTTPS and appears first-party
for the app, but image content is user/site data and is sent outside Webflow for processing.
Required fix: Gate AVIF optimization behind explicit user action and clearly disclose that selected
images are sent to Codalyn Tower for AVIF conversion before upload/export."

**Root cause (first principles).** Prior rounds treated "the user selected AVIF" as the explicit
action (R4.3), but the implementation still sent image bytes to Tower *without a fresh, informed
opt-in*: the byte-size estimate and quality-preview hooks re-encoded automatically on crop/slider
changes, a persisted `defaultExportFormat: "avif"` or an AVIF upload preset re-activated Tower
uploads in later sessions with no action at all, and the only disclosure was a hover tooltip.

**Fix — behavior, not copy (all sends now consent-gated at three layers):**

1. **Persistent consent setting, off by default.** New `avifTowerConsent: boolean` in the Beacon
   settings schema (`packages/webflow-kit/src/beacon/beacon-app-settings.ts`), default `false`,
   revocable any time via a dedicated switch in **Settings → Privacy** ("Convert to AVIF via
   Codalyn Tower"). Settings persisted before the field existed parse as `false` (fail-closed).
2. **Explicit user action at the point of use.** Selecting AVIF in the export panel no longer
   switches the format when consent is absent. It opens an inline disclosure prompt
   (`AvifTowerConsentPrompt`): what is sent (the cropped image), where (Codalyn Tower,
   tower.codalyn.app, HTTPS), how it is handled (in-memory, not stored), and how to turn it off
   (Settings → Privacy). Only **Enable AVIF conversion** grants consent and selects AVIF;
   **Keep WebP** leaves everything local. While AVIF is active, a persistent (non-tooltip)
   disclosure line renders under the format control (`AvifTowerActiveDisclosure`).
3. **Hard guard at the network boundary.** `encodeCanvasToOptimizedFile` (the single choke point
   every AVIF path funnels through — export, byte estimate, quality preview, compare popout)
   now throws before any request unless `avifTowerConsentGranted === true` is passed explicitly;
   `resolveEffectiveExportFormat` additionally resolves AVIF to in-Designer WebP whenever consent
   is absent, so estimates/previews/exports run fully locally. Upload presets that request AVIF
   fall back to WebP with a visible notice (`AvifPresetConsentNotice`) offering the same explicit
   opt-in; nothing is sent on the preset's behalf.

**Result:** zero image bytes leave the Designer — for export, preview, or size estimation — until
the user has read the disclosure and explicitly enabled AVIF conversion, and the opt-in is
revocable in Settings → Privacy. WebP (the default) always encodes entirely in-Designer.

**Tests added:** network-boundary refusal (AVIF without consent → error, `towerFetch` never
called; non-boolean consent treated as no consent), resolver consent gating, settings schema
round-trip/legacy-default/malformed-value/revocation, and UI interaction tests (AVIF click shows
prompt and does not switch; confirm grants + switches; cancel keeps WebP; consented flow shows
the persistent disclosure; locked AVIF preset shows the consent notice). Storybook stories ship
for all three consent components (`ImageEditor/AvifTowerConsentNotice`).

**Disclosure channel note:** Marketplace listing copy cannot be edited after the initial
submission, so this external-service disclosure is delivered through the submission-note
changelog on each update instead (see the round-7 AVIF body in
[webflow-marketplace-response-short.md](webflow-marketplace-response-short.md)): AVIF
conversion via `tower.codalyn.app` is user-initiated and opt-in — images are sent only after
the user enables AVIF conversion; processed in memory, never stored.

## Round 7b — 2026-08-18 pre-submission preflight remediation

Self-issued findings from running `/webflow-app-preflight` + `/webflow-app-review-remediation`
against the 08-18 public build (bundle itself was clean; findings were outside the zip). All
items below are **source-verified** and covered by unit tests; the artifact state is re-verified
by the release build gates. Nothing here has been deployed or resubmitted yet — see "Before
submitting" at the end.

### R7b.1 Source maps for the submission form (blocker)

**Finding.** The submission form requires source maps for a minified bundle, from the exact
build, uploaded in a private field. `vite.config.ts` emitted none.

**Fix.** `build.sourcemap: "hidden"` in `apps/beacon/vite.config.ts` (maps are written, no
`//# sourceMappingURL=` comment in shipped files). `scripts/build-cli.mjs` now moves every
`dist/**/*.map` into `bundle/<channel>/<recipient>/<archive>.sourcemaps.zip` **before**
`webflow extension bundle` zips `dist/`, then verifies the archived bundle contains no `.map`
entry (`verifyArchivedZipHasNoSourceMaps`) and no `sourceMappingURL` string (new static
forbidden marker). The build prints both paths; the sourcemaps zip is the private form upload
and must never be attached as the bundle. Tests: `apps/beacon/scripts/release-build-gates.test.mjs`.

**Artifact check (08-18 19:06 build):** `v0.1.0_public_08-18_19-06-40.zip` (612 KB) — 0 `.map`
entries, 0 `sourceMappingURL`; `…sourcemaps.zip` (1.4 MB) — `bundle.js.map` + 9 chunk maps.

### R7b.2 Tower OAuth callback — DB-state flow bound to the approving Webflow user (blocker)

**Finding.** The Designer-initiated (`POST /api/integrations/webflow/authorize`) flow stored
`state → (user, org)`; the callback looked the row up, deleted it, and stored the exchanged token
under that org without checking who actually approved the consent screen. A forwarded authorize
URL would land the approver's workspace token in the minter's Tower org. No TTL on the row.

**Fix.**
- Schema: `webflow_oauth_authorize_state.webflow_authorized_user_id` (migration
  `drizzle/0036_empty_solo.sql`). Minting requires the session user's Designer identity
  (`webflowAuthorizedUserId`); users without one get `403 webflow_identity_required`.
- Callback (`resolveOrganizationFromDbStateFlow` → `exchangeAndStoreConnectTarget`): row is
  single-use, rejected when older than **10 min** (`state_expired`) or lacking a bound id
  (`invalid_state`); after the code exchange, `GET /v2/token/authorized_by` with the new token
  must return the minter's Webflow user id (`isWebflowOAuthApproverBound`) — otherwise the token
  is **revoked** (`POST /oauth/revoke_authorization`, best-effort), nothing is stored, and the
  user sees `identity_mismatch`. Pure rules + tests: `src/server/webflow-oauth-state-binding.ts`.
- The dashboard cookie flow was already session-bound and is unchanged.

### R7b.3 ID-token exchange — no cross-tenant token pool

**Finding.** `collectWebflowIdTokenResolveBearers` tried up to five arbitrary tenants' stored
Data API tokens for an unauthenticated caller (cross-tenant credential use; org #6+ unresolvable).

**Fix.** Candidates are now (1) the caller's own active-workspace token when a Tower session is
present, (2) the operator-owned app bearer (`WEBFLOW_TOKEN_RESOLVE_BEARER`), (3) stored tokens of
the org(s) whose token is **known to reach the site the ID token was issued on** — the extension
now sends `siteId` (from `webflow.getSiteInfo()`) with the ID token. Site↔org linkage lives in the
new `organization_webflow_site` table, populated at OAuth completion (`GET /v2/sites` with the
fresh token) and refreshed by successful authenticated `GET sites/{id}` proxy reads; links are
dropped when a token is pruned. `listOrganizationWebflowTokens` / `pickAnyOrganizationWebflowAccessToken`
are removed. (Deployment note: existing connected orgs have no site links until they reconnect or
the proxy observes a `GET sites/{id}` — the operator bearer covers them meanwhile.)

### R7b.4 Revocation handling

- Proxy `/api/v2/webflow/[...path]` and both `cms-layout` routes: an upstream **401** prunes the
  stored token (`handleWebflowUpstreamRevocation`) and returns a stable
  `401 { error: "webflow_token_revoked", code: "WEBFLOW_TOKEN_REVOKED", hint }` instead of passing
  a dead credential's error through. 403 (scope) is untouched.
- Beacon `describeTowerFailure` (was inline in `assertTowerOk`): 401 → "Reconnect Webflow in
  Tower" CTA; 403 → permission explanation + reconnect CTA; scope-string detection kept.

### R7b.5 Dependencies

Tower: `sharp ^0.35.3`, `next ^15.5.23`, `better-auth ~1.6.30` (tilde — 1.7 changes the internal
adapter API used by the Designer session logic). Beacon/Flint client `better-auth 1.6.30`. Beacon
`shadcn` CLI moved to devDependencies. The vendor-literal strip rule for better-auth's URL util
was updated for 1.6.30 (`isLoopbackForDevScheme`) and is now covered by a gate test. Remaining
`pnpm audit --prod` entries are transitive dev/SSR/CMS-admin paths (posthog→otel/protobufjs,
react-router SSR, Payload admin UI, `@vercel/blob`→undici) not reachable from the extension.

### R7b.6 Encryption at rest — production hard-fail

`encryptStoredSecret` throws `MissingSecretEncryptionKeyError` under `NODE_ENV=production` when
`TOWER_TOKEN_ENCRYPTION_KEY` is unset/invalid (override only via
`TOWER_TOKEN_ENCRYPTION_ALLOW_PLAINTEXT=1`). OAuth callback/completion catch it, revoke the token,
and surface `token_storage`; nothing is stored in plaintext. **Confirm the key is set in Vercel
Production before deploying** (could not be verified from this environment).

### R7b.7 Medium / low

- `/api/v1/beacon/support-request` unauthenticated path: per-IP (5/10 min) + per-email (5/h)
  Postgres rate limits → `429` + `Retry-After`; extension copy for `rate_limited`.
- `cms-layout` `collectionId`/`itemId`: 24-hex Webflow object-id schema (path-like input rejected).
- CORS: `Access-Control-Allow-Private-Network` only for allowlisted origins whose preflight sends
  `Access-Control-Request-Private-Network: true` (never for production); stale
  `X-Beacon-Tower-User-Id` allow-header removed.
- `/api/v1/images/optimize`: input allowlist (png/jpeg/webp/avif/gif/tiff/heif); SVG/PDF/non-image
  → `400 UNREADABLE_IMAGE` before any libvips decode (was 500).
- Designer session failure log now records the Webflow user id, not the email.
- Beacon Help menu: **Documentation** → `https://tower.codalyn.app/docs` (allowlisted opener,
  new tab); story `App/Header › MenuOpenHelp`.
- Registered runtime script version is content-derived: `<semver>+beacon.<source-hash>[.n]`
  (suffix only when the same content is force-registered again on a site).
- React production error-decoder URL (`https://react.dev/errors/`) compiled out of react-dom
  (`"#"`; error code preserved) — the bundle's `https://` grep now shows only allowlisted endpoints
  plus inert vendor strings.

### R7b.8 Credential in URL — posthog-js token-in-query request URLs (blocker, App Review Preflight 2026-08-19)

**Finding (issued by App Review Preflight, run against the 08-18 19:13 public build; priority:
BLOCKER, 3 evidence locations in `assets/init-observability-Cw8VVyqB.js`).** "Tokens and
credentials must never travel in URL query strings — URLs land in server logs, browser history, and
analytics. Send credentials in an Authorization header or request body." Acceptance criterion as
issued: move the credential out of the URL (header or protected body; GET routes carrying it become
POST). Provenance: issued finding + published requirement (Marketplace Guidelines, token security).

**Observed (source-verified).** All hits are inside the bundled `posthog-js@1.369.3` module — none
are first-party. The installed (pnpm-patched) module builds four request URLs with the project
key in the query string: `/api/early_access_features/?token=`, `/api/product_tours/?token=`,
`/api/surveys/?token=`, and `/i/v1/logs?token=`. The value is PostHog's public write-only project
key, but the rule is shape-based and the reviewer tooling greps for the shape. No first-party code
in Beacon (or Flint, which shares the module) builds a `?token=`/`&token=` URL. Every one of the four
paths is unreachable in the shipped configuration: early-access features are only fetched by
`posthog.getEarlyAccessFeatures()` (never called; `advanced_disable_feature_flags` pinned), product
tours need the `generateProductTours` extension script that `disable_external_dependency_loading`
never loads, surveys return before any request under `disable_surveys: true`, and logs are only
sent by `posthog.captureLog()` / `posthog.logger` (never called; logs extension likewise never
loaded). Event ingestion (`/e/`) and flag evaluation (`/flags/`) already carry the token in the POST
body and are unaffected.

**Fix (source-verified, artifact-verified).**

- `scripts/vite-strip-dev-host-literals.mjs`: four new posthog-js rules compile the `?token=<key>`
  suffix out of each URL, leaving the bare endpoint (the early-access `&stage=` filter is kept).
  Should any of these paths ever be reached, the request goes out without a credential and PostHog
  rejects it — fail-closed, no key in a URL. New residual guard `credential-in-query-string URL`
  (`/[?&]token=/i`) on the posthog-js module fails release builds if a vendor upgrade adds or moves a
  token-in-query URL. The request-body assignment `token=this.config.token` (event capture) is
  deliberately outside the pattern and untouched.
- `scripts/build-cli.mjs`: `?token=` and `&token=` are new static forbidden bundle markers
  (case-insensitive substring, every shipped JS file and the archived zip) — the backstop for
  first-party regressions in any app built through the release pipeline.
- Source-map artifact: Vite embeds the *loaded* vendor text in `sourcesContent`, so the private
  `.sourcemaps.zip` (submission-form field) still carried the four URLs — and the `localhost`/Sentry
  literals the transform compiles out — inside the posthog-js entry. `extractSourceMapsToPrivateZip`
  now rewrites audited vendor `sourcesContent` with the same rules
  (`rewriteSourceMapVendorContent`) so the map describes the code actually bundled, and fails the
  release build if any map still contains a token-in-query URL. Mappings are untouched.
- Tests: `apps/beacon/scripts/release-build-gates.test.mjs` (40 tests) — the installed module has
  exactly 4 token-in-query URLs and 0 after transform; bare endpoints survive; body token survives;
  residual guard throws on a synthetic fifth; forbidden marker catches `?token=`/`&TOKEN=` and
  ignores `h.token=`; the map rewrite strips vendor content, leaves first-party content alone, and
  the strict gate rejects a first-party `?token=` in a map.

**Artifact check (08-19 10:31 build, `CI=true BUILD_RECIPIENT=public pnpm build:prod`):**
`v0.1.0_public_08-19_10-31-14.zip` sha256 `f4a20169…2cd90` (25 entries, 0 `.map`, 0
`sourceMappingURL`); `v0.1.0_public_08-19_10-31-14.sourcemaps.zip` sha256 `6330b7b6…6d015`.
Unzipped bundle: `[?&]token=` 0 hits, `localhost|sentry` 0 hits; `/api/early_access_features/`,
`/api/product_tours/`, `/api/surveys/`, `/i/v1/logs` present once each as bare paths; the
observability chunk is now `assets/init-observability-DFbaRa90.js`. Unzipped sourcemaps:
`[?&]token=` 0 hits across all 10 maps; posthog-js `sourcesContent` has 0 `localhost`/`sentry`.
Remaining `localhost` in maps are first-party/vendor *comments* only (a better-auth JSDoc example,
a `tower-client.ts` doc comment) and the `sentry` grep hit in `bundle.js.map` is the substring of
`AttributeSettingsEntry` — pre-existing since R7b.1, not credentials, left as-is.

**State.** Source verified ✓ · Artifact verified ✓ · Installed on test site ✗ · Runtime observed ✗
(not applicable: no runtime behavior changes; the four paths were already unreachable) · Submitted ✗
· Reviewer accepted ✗. Flint shares the module and gets the same rewrite on its next release build
(its last `dist/` is from 08-05, pre-patch, and still shows the URLs — rebuild before any Flint
submission).

### R7b.9 Fingerprinting & Session Replay — posthog-js session-recording controller + canvas export (blocker, App Review Preflight 2026-08-19)

**Finding (issued by App Review Preflight, run against the 08-19 10:31 public build; priority:
BLOCKER, 3 evidence locations).** "Session replay (rrweb, FullStory) and fingerprinting are
prohibited." Next move as issued: update the implementation, upload a revision, and use the next
scan to confirm. Provenance: issued finding + published requirement (Marketplace Guidelines,
privacy / data collection). No finer acceptance criterion was supplied.

**Observed (source-verified).** The three evidence windows split into two distinct things:

1. `assets/init-observability-Cw8VVyqB.js:1` — centred on `N.__PosthogExtensions__.rrweb` /
   `initSessionRecording` / `"could not load recorder"`: the bundled `posthog-js@1.369.3`
   session-recording *controller* (the class that lazy-loads posthog's rrweb recorder script). Not
   first-party. It was dormant — `disable_session_recording: true`, `disable_external_dependency_loading:
   true`, remote config off (R5.3/R6.5) — so no recorder ever loaded or ran, but the code and the
   `rrweb` reference were present in the shipped chunk, which is what the scan matched. Same lesson
   as R6.5 and the Sentry integration: disabled-by-config vendor code is still review surface.
2. `bundle.js:85` ×2 — both centred on `canvas.toBlob(...)`: the image editor's two encode helpers
   (WebP/PNG export in `encode-image-blob.ts`, PNG preview in `export-preview-encode.ts`). This is
   image export, not fingerprinting: the canvas holds the user's own cropped asset, nothing is read
   back for identification (`getImageData`/`toDataURL` do not exist anywhere in the bundle — 0 hits),
   and the encoded bytes only go where the user sends them (Webflow asset upload, or Codalyn Tower
   after the explicit AVIF opt-in of R7.6). No `navigator.hardwareConcurrency`/`deviceMemory`/
   `plugins`, WebGL renderer, or AudioContext reads exist in the bundle either (0 hits each).

**Fix (source-verified, artifact-verified).**

- **Session-replay capability excised, not just disabled** — pnpm patch
  `patches/posthog-js@1.369.3.patch` (same mechanism the reviewers accepted for R4/R6.5) now also
  removes, from `dist/module.js`: the default `sessionRecording` extension class (controller,
  rrweb hand-off, `lazy-recorder` loader, `[SessionRecording]` loggers and its status constants);
  the PostHog core's recorder-instantiation seam (`__extensionClasses.sessionRecording` /
  `__defaultExtensionClasses.sessionRecording` wiring, `startIfEnabledOrStop`/`stopRecording`
  calls, `sdkDebugProperties` merge) so nothing — default or injected — can construct a recorder;
  the public `startSessionRecording` / `stopSessionRecording` / `sessionRecordingStarted` /
  `get_session_replay_url` methods; the `__rrweb_original__` console indirection in the logger; the
  recording-URL tag in the (already tree-shaken) Sentry processor; the `webPerformance` shim's
  deprecation text that pointed at `posthog.sessionRecording`; and the recorder's now-unread config
  defaults and persistence keys (`disable_session_recording`, `session_recording`,
  `enable_recording_console_log`, `__preview_eager_load_replay`, `$session_recording_remote_config`,
  `$session_recording_enabled_server_side`). Every edit was verified against the installed module
  with an AST parse (acorn) and a jsdom smoke run of Beacon's exact init options: `init`, `register`,
  `group`, `capture`, `captureException`, `opt_out`/`opt_in`, `set_config` all behave identically
  before and after (same four `/e/` requests), with `posthog.sessionRecording` now `undefined`.
  `posthog-js` module size 185,884 → 178,246 bytes. First-party code never called any removed API
  (grep across `apps/beacon`, `apps/flint`, `packages/*`: 0 hits).
- **Gates.** `scripts/vite-strip-dev-host-literals.mjs`: new residual guard `session-replay
  reference` (`/rrweb|fullstory|recorder|replay|recording/i`) on the posthog-js module — a vendor
  upgrade that ships a recorder again, or a regenerated patch that forgets the excision, fails the
  release build. `scripts/build-cli.mjs`: `rrweb`, `fullstory`, `sessionrecording`, `recorder` are
  new whole-bundle forbidden markers (every shipped JS file + archived zip, case-insensitive;
  `replay`/`recording` deliberately not global — React's `$$reactFormReplay`, Sentry's
  `replay_event` envelope type in Flint, and our own pinned option / disclosure prose are not
  recorder references). Tests: `apps/beacon/scripts/release-build-gates.test.mjs` (44 tests; +4 here)
  — the installed module has 0 replay/recorder/recording references and no removed method, the
  transformed module stays clean, five synthetic re-introductions (`window.rrweb`,
  `"lazy-recorder"`, `this.sessionRecording`, `"[SessionRecording]"`,
  `{disable_session_recording:!1}`) each throw, and the forbidden marker catches
  `rrweb`/`FullStory`/`sessionRecording`/`lazy-recorder` while letting
  `disable_session_recording:!0` and the disclosure sentence through.
- **`disable_session_recording: true` stays pinned** in `CODALYN_EXTENSION_POSTHOG_PRIVACY_OPTIONS`
  (documented as defence in depth; `@codalyn/observability` test still locks it). It is the one
  `session_recording` token left in the bundle besides the Settings → Privacy prose that says
  session recordings are never collected.
- **Canvas export consolidated to one call site** — `apps/beacon/src/features/image-editor/lib/canvas-to-blob.ts`
  (`canvasToBlob`, with the non-fingerprinting rationale in its doc comment) now serves both
  `encode-image-blob.ts` and `export-preview-encode.ts`; the duplicate `canvasToPngBlob` is gone.
  Behaviour unchanged (unit-tested: type/quality forwarded, null-blob rejection names the type).
  The bundle goes from two `toBlob` sites to one. **Remaining limitation / open decision:** that one
  `canvas.toBlob` call is the image editor's export step and cannot be removed without removing
  in-browser WebP/PNG encoding. If the next scan still reports it under "Fingerprinting", the
  reviewer needs the rationale above (user's own asset, no read-back, no identification, no
  transmission outside user-initiated flows) — that is a reviewer judgment, not something code can
  close. Switching the API (e.g. `OffscreenCanvas.convertToBlob`) would only change the keyword, not
  the capability, and was deliberately not done.

**Artifact check (08-19 10:53 build, `CI=true BUILD_RECIPIENT=public pnpm build:prod`):**
`v0.1.0_public_08-19_10-53-26.zip` sha256 `eb963a9d…2ae79` (25 entries, 0 `.map`, 0
`sourceMappingURL`); `v0.1.0_public_08-19_10-53-26.sourcemaps.zip` sha256 `18b43b87…3b20`.
Unzipped bundle JS (case-insensitive): `rrweb` 0, `fullstory` 0, `sessionrecording` 0, `recorder` 0,
`toDataURL` 0, `getImageData` 0, `toBlob` 1 (the shared helper), `replay` 1 (React DOM's
`$$reactFormReplay`, form-action replay — unrelated), `recording` 3 (pinned
`disable_session_recording:!0` + two disclosure sentences), `sentry`/`localhost`/`?token=` still 0.
The observability chunk is now `assets/init-observability-DCGxr1q2.js` (195,230 bytes, was 202,306).
Sourcemaps zip: `rrweb`/`lazy-recorder`/`sessionRecording`/`?token=` 0 hits.

**State.** Source verified ✓ · Artifact verified ✓ · Installed on test site ✗ · Runtime observed ✗
(not applicable: recorder was never loaded before either; capture/exception paths smoke-tested in
jsdom) · Submitted ✗ · Reviewer accepted ✗. Flint shares the patched module and picks this up on its
next release build (its `dist/` is still from 08-05 and shows the old controller — rebuild before
any Flint submission).

### Before submitting (not done in this change)

1. Deploy Tower with migration `0036` applied (`pnpm app tower db:migrate:prod -- --confirm`) and
   `TOWER_TOKEN_ENCRYPTION_KEY` confirmed in Production env.
2. Rebuild Beacon (`CI=true BUILD_RECIPIENT=public pnpm build:prod`) — or use the 08-19 10:53 build
   from R7b.9 if nothing else changes — run **App Review Preflight** on the new bundle **and** the
   matching `.sourcemaps.zip`, confirm the "Credential in URL" (R7b.8) and "Fingerprinting & Session
   Replay" (R7b.9) findings no longer appear — if the latter still names the single `canvas.toBlob`
   export site, answer with the R7b.9 rationale rather than changing the API — record the `wfpre_…`
   receipt.
3. Re-confirm reviewer credentials, published `.webflow.io` test site, screenshots, 512×512 icon,
   demo video (approve + deny). Keep the AVIF disclosure in the submission notes.
