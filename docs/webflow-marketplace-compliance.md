# Webflow Marketplace Compliance — Beacon

Point-by-point response to the Webflow app-review feedback (July 2026), mapping each flag to what
the app does and what changed. Doc references verified against developers.webflow.com on 2026-07-08.
Round-2 feedback (2026-07-09) is addressed in [Round 2](#round-2--2026-07-09-follow-up-flags);
round-3 feedback (2026-08) in [Round 3](#round-3--2026-08-senior-engineer--review-team-flags).
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
- Debug HUD source ships only on dev/preview channels; production builds embed no-op stubs.

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
  are inert property names inside posthog-js's optional Sentry-integration shim and its
  bot-detection UA list — no Sentry SDK code, no Sentry network endpoint, no iframe path.
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
  the layout and strips designer placeholders. Debug HUD ships only on dev/preview channels;
  production embeds no-op stubs (verified absent from the shipped bundle).
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
- Verified in the rebuilt bundle: the unconditional `id:"redirect"` plugin is gone; the
  allowlisted replacement is present. (No current Beacon flow returns `redirect: true`; the
  guard exists so any future one is origin-constrained by construction.)
- The existing OAuth popup allowlist (`isAllowedWebflowAuthorizeUrl`, round 1) is unchanged.

### R3.5 Runtime style injection under strict CSP

- All first-party CSS is static: Vite emits a single `styles.css` (`cssCodeSplit: false`) linked
  from `index.html`; the compare popout uses external `quality-compare.css`. No inline `<style>`
  blocks or `style=""` attributes in any shipped HTML.
- **Fixed:** `react-easy-crop` no longer injects a `<style>` tag at mount —
  `disableAutomaticStylesInjection` is set and its stylesheet is bundled statically into
  `styles.css`.
- Remaining runtime injectors are two third-party libraries with no nonce/opt-out path in this
  build: `react-remove-scroll` (Radix modal scroll lock) and `vaul` (drawer keyframes). The
  extension therefore currently requires `style-src 'self' 'unsafe-inline'`; there are no
  external style origins, no `blob:`/`data:` styles, and `script-src 'self'` holds throughout
  (no inline scripts anywhere, unit-tested for the popout page).

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
