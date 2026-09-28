# Earlier reviewer responses (reference only — do not paste into the form)

Bodies that were pasted into the review form's ≤500-character response field in rounds 6–7b, newest
first. **That field no longer exists on the submission form** (R8.19): the 500-character field in the
current flow is the *Publish new version* dialog's version notes, drafted in
[../SUBMIT.md](../SUBMIT.md) Step 6a. These bodies are now only email-thread material. Engineering
detail per round: [../compliance-record.md](../compliance-record.md).

---

Round 8 body, drafted for the form field that turned out not to exist (2026-09-22). Usable verbatim
as a reply on the review email thread; the same six items are in SUBMIT.md Step 6b *Additional notes*
in full:

1) No automatic workspace request: a lone workspace is only suggested and saved on the user's click; the server sets no default for extension sessions. 2) No telemetry SDK in this build; a redaction handler covers builds with one. 3) All requests use redirect mode error. 4) Uploads only to the exact create-asset uploadUrl; connect-src allows only that bucket. 5) No unsafe-inline; style attributes blocked. 6) cmsLocaleId on every CMS write; localized sites are not written (listing says so).

---

Earlier round-7b response (kept for reference, second-scan findings): Preflight findings resolved: the bundled auth client is gone — every request is a first-party fetch to our Tower origin, enforced by the shipped CSP. styles.css ships a version-3 source map from the same build. No http:// or ws:// URL remains (W3C namespaces aside); react-dom's innerHTML writes are compiled out; the site runtime renders sanitized nodes. The one MutationObserver left is the rich-text editor's contenteditable sync in our own iframe, driven by typing; it never touches the canvas.

---

Earlier round-7b response (kept for reference, postMessage/popup blockers): the extension opens no windows — every external destination (Tower, Webflow OAuth consent, policy pages) is a plain <a target="_blank" rel="noopener noreferrer">, and the release build fails on any window.open. Single-use handoff/OAuth-state URLs are minted before the click and refreshed when stale; the grant is detected by bounded, user-initiated polling. The only postMessage left is React's MessageChannel scheduler (no targetOrigin exists).

---

Earlier round-7 response (kept for reference, AVIF privacy flag): AVIF conversion is now opt-in, off by default. Selecting AVIF shows an in-context consent prompt disclosing the image is sent to our first-party Tower service (tower.codalyn.app) for conversion — in memory, never stored; revocable in Settings → Privacy. A persistent disclosure shows while AVIF is active. A hard guard at the single network call site refuses AVIF without consent, so no path (previews, size estimates, saved presets) sends image bytes unconsented. WebP stays fully in-Designer.

---

Earlier round-7 response (kept for reference, popup + telemetry flags): CSP is now enforced via meta tag in both shipped documents: connect-src allowlists only our Tower backend, https://us.i.posthog.com (sole telemetry processor; strictly opt-in), and Webflow's presigned upload hosts; the popout is connect-src 'none'; tests pin every directive and the build fails if the CSP is absent. Auth popups require opener access (gesture-gated blank-window open, token returned via postMessage); destinations allowlisted with exact origin+source checks, now unit-tested.

---

Earlier round-7 response (kept for reference, DOM-manipulation flag): The compare popout's hand-written script is deleted; quality-compare.js is now compiler output. The page is a second Vite entry rendered by React — the extension's own framework/state layer. All flagged patterns (getElementById, setProperty, setAttribute, classList, textContent, img.src) are gone; the UI is declarative JSX driven by React state. Opener origin+source trust checks, typed message validation, blob-URL revocation, and the no-inline-script CSP posture are preserved and tested.

---

Previous round (kept for reference, round 6): All flags resolved: URL validation is https-only (http:/sms: rejected; the bundled editor lib is patched so those schemes are absent). The site runtime no longer touches iframe/embed sources. The auth one-time token moved from query string to URL fragment + POST body redemption (same-origin enforced). PostHog web-experiment code is excised from the bundle, not just disabled, and all privacy flags are pinned by tests. Runtime behavior + full endpoint list documented in the submission notes.

## 2026-09-17 — draft form text for the 17:51 build (never filed; superseded the same evening by the 19:58 build, compliance-record R8.12)

## 2026-09-18 — filed form text (App Update ref 16838bba-c288-47ee-93e2-a0a19cfd7ece), replaced by R8.18 on 2026-09-22

Filed with `v0.1.0_public_09-18_10-25-07.zip`. Per Webflow (2026-09-22) the extension version behind this filing was
published for internal testing only and never entered review (compliance record R8.18); the text below was never read
by the review team.

### §3 Response to the review team (494 chars, as filed)

```
1) No automatic workspace request: a lone workspace is only suggested and saved on the user's click; the server sets no default for extension sessions. 2) No telemetry SDK in this build; a redaction handler covers builds with one. 3) All requests use redirect mode error. 4) Uploads only to the exact create-asset uploadUrl; connect-src allows only that bucket. 5) No unsafe-inline; style attributes blocked. 6) cmsLocaleId on every CMS write; localized sites are not written (listing says so).
```

### §4 Additional notes (4984 chars, as filed)

```
WHAT CHANGED (bundle v0.1.0, 09-18_10-25-07) - 1 to 6 answer the 2026-09-17 feedback in order; 7, 8 the Preflight scans

1. Workspace state. The effect that posted the single workspace to /api/v1/beacon/active-workspace on sync completion is removed. A user with one workspace and none active sees it as a suggestion with an explicit "Use this workspace" control; the only request to that endpoint comes from that click or the multi-workspace picker. The server changed too: an extension session without a chosen workspace stays without one (no default from memberships, nothing written) until the user confirms. Unit tests pin zero requests after sync, one after the click, no server fallback.

2. Exception telemetry. The Marketplace build ships no telemetry SDK: the dependency sits behind a build-time release flag that is off for Marketplace bundles; the release build fails if it is on and verifies the zip has no trace of it (no analytics chunk, no telemetry host, no consent prompt). Settings and the privacy policy say so. Builds that enable telemetry run a redaction handler on every event (URLs, referrers, titles, e-mail, tokens, query strings), unit-tested with synthetic values.

3. Redirects. The single network call site (extension-egress.ts) runs every request with redirect mode set to error; callers cannot override it. No path needs a redirect: Tower answers its API routes directly and the presigned S3 upload returns a 2xx with no redirect field.

4. Upload allowlist. The create-asset adapter registers the exact uploadUrl string Webflow returned as a one-shot permitted destination, only if it names the webflow-prod-assets bucket: host exactly webflow-prod-assets.s3.amazonaws.com (the form production returns) or host s3.amazonaws.com with first path segment webflow-prod-assets (the form the reference documents). The egress policy accepts an upload only for a granted URL and consumes the grant; other buckets, regional S3 hosts, lookalikes and Webflow-owned hosts are refused before any request. connect-src names that bucket, never the bare S3 host: self, https://tower.codalyn.app, https://webflow-prod-assets.s3.amazonaws.com and https://s3.amazonaws.com/webflow-prod-assets.

5. CSP style directives. unsafe-inline is removed: style-src and style-src-elem allow self plus the hosted bundle host; style-src-attr is none. The UI sets styles through the CSSOM, which CSP does not govern. The two style-attribute writes left in the bundle are pinned by count in the release build; both are Designer API calls styling the CMS Slots placeholder on the user's canvas element, outside the extension's policy. All UI stories render clean under it.

6. Localization. Every CMS item write names its locale: the extension reads the site's locales (Get Site) once per session and sends the primary locale's cmsLocaleId on every write (image editor field update; CMS Slots layout save, staged and live) and on the matching staged read. Sites with secondary locales are not written: the write is refused before any request with an in-app message. The listing states this.

7. Rich text editing. The rich-text property editor is withdrawn behind a release flag like item 2; its Lexical editor observed its own editable element inside our panel, never the canvas, the shape the bundle scan flagged. Rich-text properties are edited as HTML in a text box; the bundle has no observer construction and no editable-content element.

8. Browser storage and cookies. The session bearer is held in memory only; no storage call in the bundle is keyed by a credential name. Every request sets the cookie mode to omit at the single call site, so no cookie is sent or stored; the only credential on the wire is our Tower session bearer, sent only to tower.codalyn.app.

UNCHANGED FROM 2026-09-15: one network call site with an explicit destination policy (release build fails on a second); canvas changes only through the Designer API on explicit user action; Tower with allowlist-only CORS, session-only auth, server-stored OAuth state, the Webflow ID token never forwarded; no plaintext-HTTP or insecure-websocket URLs, no HTML-injection sinks, no popups or cross-window messaging, no credentials in URLs, no session replay; every shipped JS and CSS file has a v3 source map (private field); none names a map.

PUBLISHED-RUNTIME TEST: one page-level script, registered with a SHA-256 integrityHash carried verbatim in the page tag with anonymous crossorigin; served unminified, its last line pointing at a version-3 source map published beside it as a site asset (sourcesContent is the file minus that line; no trailing newline). Every other script on the test page is Webflow's own site runtime; Beacon loads none.

BACKEND (Hybrid): https://tower.codalyn.app only, HTTPS, production; paths as filed on 2026-09-15; in-app policy and docs links are anchors on it. Other destination: the presigned upload URL in item 4. No telemetry host. Uninstall and AVIF disclosure unchanged.
```

## 3. Response to the review team (≤500 characters)

496 characters. Free of angle brackets, attribute pairs and JS API names (form WAF, see §4).

```
1) No automatic workspace request; a single workspace is held locally and saved only when the user confirms it. 2) This build ships no telemetry SDK; a redaction handler exists for builds that do. 3) Every request uses redirect mode error. 4) Uploads go only to the exact create-asset uploadUrl on the documented S3 host and bucket; connect-src matches. 5) No unsafe-inline; style attributes are blocked. 6) cmsLocaleId on every CMS write; localized sites are not written and the listing says so.
```

How to defend each item if asked (one line each; the long version is in §4):
- **Workspace persistence** — the effect was deleted; `suggestedWorkspaceId` is local state and the only POST is behind the "Use this workspace" click (unit-pinned: zero POSTs after sync, one after the click).
- **Telemetry redaction** — the Marketplace build has no analytics SDK (453 KB zip, no posthog trace, no telemetry host in connect-src); the before_send redaction is unit-tested with synthetic sensitive values for builds that enable telemetry.
- **Redirects** — the single fetch site pins redirect mode to error and callers cannot override it (unit-pinned).
- **Upload allowlist** — exact uploadUrl string granted per create-asset response, single use, host and bucket pinned; CSP connect-src is Tower plus that one host.
- **CSP styles** — no unsafe-inline anywhere; React/Radix/vaul use the CSSOM; the only style-attribute writes in the bundle are the two Designer API calls on the user's canvas element; every Storybook story renders under the enforced policy with zero violations.
- **Rich text editing (item 7, not one of the six)** — the Lexical editor is flag-gated out of this bundle, so it carries no `MutationObserver` at all; `richText` props are composed as HTML in a textarea. Pinned by count in the release build and by a forbidden-marker sweep for any `lexical` trace.
- **Localization** — cmsLocaleId on every CMS item write (primary, named explicitly); sites with secondary locales are refused in-app with a message; stated in the listing.

## 4. Additional notes (form field, max 5000 characters)

4975 characters. Paste the whole block. **WAF rule (2026-09-15):** the form backend sits behind Cloudflare and blocked a
submission whose notes contained an HTML script tag, attribute pairs like `src=` / `integrity=`,
DOM-sink names (innerHTML, window.open, postMessage, document.write), a `\u00a0` escape and `/*`. Keep
this block free of angle brackets, key=value attribute pairs, JS API names and comment/wildcard tokens;
describe them in words.

```
WHAT CHANGED (bundle v0.1.0, 09-17 09-17_17-51-37) - items 1 to 6 answer the 2026-09-17 feedback in order; items 7 and 8 answer the Preflight scans

1. Workspace state. The effect that posted the single workspace to /api/v1/beacon/active-workspace on sync completion is removed. A signed-in user with exactly one workspace and none active sees it as a suggestion with an explicit "Use this workspace" control; the only request to that endpoint comes from that click or the multi-workspace picker. Unit tests pin zero requests after sync and one after the confirmation.

2. Exception telemetry. The Marketplace build ships no telemetry SDK at all. The dependency sits behind a build-time release flag that is off for Marketplace bundles; the release build fails if it is on and verifies the zip contains no trace of it. Verifiable in the bundle: no analytics chunk, no telemetry host in connect-src, no consent prompt, and Settings, Privacy states that this build sends no usage or error telemetry; the privacy policy says the same. Builds that enable telemetry run a before_send redaction (URLs, referrers, titles, e-mail, tokens, query strings, exception text and frames), unit-tested with synthetic sensitive values.

3. Redirects. The single network call site (extension-egress.ts) runs every request with redirect mode set to error; the caller's options cannot override it. No path needs a redirect: Tower answers its API routes directly and the presigned S3 upload returns a 2xx with no redirect field.

4. Upload allowlist. The create-asset adapter registers the exact uploadUrl string Webflow returned as a one-shot permitted destination, only if it is HTTPS on host exactly s3.amazonaws.com with first path segment exactly webflow-prod-assets. The egress policy accepts an upload only for a granted URL and consumes the grant with the request; other keys, other buckets, regional or virtual-hosted S3 hosts and Webflow-owned hosts are refused before any request is built. connect-src is exactly: self, https://tower.codalyn.app, https://s3.amazonaws.com. Webflow asset hosts stay in img-src only.

5. CSP style directives. unsafe-inline is removed: style-src and style-src-elem allow self plus the hosted bundle host; style-src-attr is none. React, Radix and vaul set styles through the CSSOM, which CSP does not govern. The two style-attribute writes left in the bundle are pinned by count in the release build; both are Designer API calls that style the CMS Slots placeholder on the user's canvas element, outside the extension's policy. Every UI story renders clean under the enforced policy in headless Chromium.

6. Localization. Every CMS item write names its locale: the extension reads the site's locales (Get Site) once per session and sends the primary locale's cmsLocaleId on every write (the image editor's CMS image-field update; the CMS Slots layout save to staged and live) and on the matching staged read. Sites with secondary locales are not written: the write is refused before any request and the user is told that Beacon does not write CMS content on localized sites yet. The listing states this.

7. Rich text editing. The WYSIWYG editor for rich-text component properties is withdrawn from this bundle behind a release flag like item 2. Its Lexical editor attached a DOM observer to its own editable element inside our panel, never the canvas — the shape the bundle scan reports as a silent canvas mutation. Rich-text properties are now edited as HTML in a text box. Verifiable in the bundle: no observer construction and no editable-content element.

8. Browser storage and cookies. The 16:38 scan excerpted the session-token module, which ran a one-time removal of a legacy browser-storage key at load. That line is gone: the session bearer is held in memory only and no storage call in the bundle is keyed by a credential name. Every request now sets the cookie mode to omit at the single network call site, so no cookie is sent to or stored from any destination; the only credential on the wire is our own Tower session bearer, sent only to https://tower.codalyn.app. The release build forbids both shapes.

UNCHANGED FROM 2026-09-15: one network call site with an explicit destination policy (release build fails on a second); canvas changes only through the Designer API, on explicit user action; one page-level hosted runtime with a SHA-256 integrityHash, pure ASCII and unminified, loading nothing and making no requests; Tower with allowlist-only CORS, session-only auth, server-stored OAuth state, the Webflow ID token never forwarded; no plaintext-HTTP or insecure-websocket URLs, no HTML-injection sinks, no popups or cross-window messaging, no credentials in URLs, no session replay; styles.css ships a v3 source map.

BACKEND (Hybrid): https://tower.codalyn.app only, HTTPS, production; paths as filed on 2026-09-15. Other destination: the presigned upload URL in item 4. No telemetry host. Uninstall and AVIF disclosure unchanged.
```

## 2026-09-15 — long-form §4 notes (8122 chars) superseded by the 5000-char form field version

The App submission form caps "Additional notes" at 5000 characters. The condensed block now in SUBMIT.md §4 replaces the two blocks below; nothing was dropped in substance.

## 4. Submission notes / changelog (long field)

```
WHAT CHANGED IN THIS UPDATE
- Published-site runtime is now pure ASCII: the three non-ASCII characters it carried (an em dash in the header comment and the U+00A0 placeholder sentinel as a raw byte in two string comparisons) are a hyphen and "\u00a0" escapes. Behaviour unchanged (unit tests execute the generated runtime). Webflow's CDN serves the file as application/javascript with no charset, so an ASCII-only file hashes identically under every decoding; a unit test pins this, and a second keeps the SHA-256 SRI free of "/" and "+" (header line "Runtime revision 3").
- Backend CORS is allowlist-only: Tower answers non-allowlisted origins with no Access-Control-Allow-Origin header (previously a credential-less "*"), and local-development origins are excluded on every deployed runtime.
- The optional shared API-key bearer for Tower's API was removed from both Tower and the extension; every request is attributed to a signed-in user session.
- react-router-dom updated to 7.18.3 (clears the published react-router advisories in the uploaded manifest/lockfile); our vendor patch that removes its framework-mode inline <script> emission is re-applied to that version.
- The in-app hint shown when deleting the last slot list on a page now tells the user to run the page uninstall on every installed page before removing Beacon from the workspace, and exactly what to delete by hand if the app was removed first.
- All network requests from the extension go through one first-party call site (extension-egress.ts) with an explicit destination policy; the release build fails if a second call site appears.
- The one MutationObserver in the bundle is the rich-text editor's (Lexical) contenteditable sync inside our own panel. It observes only that editor's root and writes only that editor's DOM. It never observes or writes the Designer canvas; canvas changes happen only through the Designer API behind explicit user actions.
- Hosted runtime script (applied to pages via the Custom Code API) is registered with a SHA-256 SRI over the exact uploaded bytes at an immutable, versioned Webflow asset URL; Webflow renders the tag's integrity and crossorigin="anonymous" from that registration. It loads no other scripts and makes no network requests (unit-pinned).
- The hosted runtime is now served as readable, unminified source (about 630 lines, Biome-formatted) with a header comment naming its version and authoring module. It is not the output of a build transform, so it is its own source: there is no separate source map to publish, and the private source-map zip contains the same modules. The runtime's behaviour is unchanged — the reformat is whitespace-only, verified by the unit tests that execute the generated runtime.
- Fixed: the shipped Content-Security-Policy now admits Webflow's hosted bundle origin (https://cdn.prod.website-files.com) for the extension's own scripts, stylesheet and fonts. The previous 'self'-only policy blocked them once installed, leaving the panel blank. No wildcard, no inline script, no new third-party host; connect-src unchanged.
- styles.css ships a version-3 source map from the same build. No http:// or ws:// URLs, no innerHTML writes, no window.open, no postMessage, no credentials in URLs, no session replay.

BACKEND DOMAINS AND ENDPOINTS (Hybrid App)
- https://tower.codalyn.app (first-party backend, HTTPS, production only). Every path the extension calls, all on this one origin:
  - /api/auth/webflow-designer — Designer ID-token exchange (server-side; issues our session)
  - /api/auth/get-session, /api/auth/sign-in/email, /api/auth/sign-out, /api/auth/one-time-token/generate — our own session lifecycle (Better Auth); the one-time token is consumed by the Tower sign-in handoff page and is never a Webflow credential
  - /api/integrations/webflow/authorize — mints the server-stored OAuth state and returns the Webflow consent URL the user opens as an ordinary link
  - /api/v1/beacon/settings, /active-workspace, /access-policy, /usage, /early-access-request, /support-request — app settings, workspace selection, entitlement, usage, and the two user-submitted forms
  - /api/v2/webflow/* — proxy to the Webflow Data API using the OAuth token stored server-side (path segments only; the upstream host is fixed)
  - image conversion endpoint — opt-in AVIF only (see below)
  - All endpoints require a session resolved server-side; CORS is allowlist-only (Webflow Designer/extension origins), no wildcard.
- Uninstall: Beacon applies code at page level only, never site-level. Deleting the last slot list on a page offers a one-click page uninstall that removes the footer script entry and orphaned runtime assets and prompts to publish; the same hint tells the user to do this on every installed page before removing the app from the workspace, and what to delete by hand (Page settings → Custom code → Footer code) if the app was removed first. Full steps: https://tower.codalyn.app/docs.
- Webflow-issued presigned asset-upload URLs (S3 / website-files.com) — direct upload of our runtime script; no credential header.
- https://us.i.posthog.com — product analytics, opt-in only, no site content.
- The Authorization bearer is sent only to the Tower origin (exact-origin match at the single call site). The Webflow ID token is never forwarded to a third party.

EXTERNAL-SERVICE DISCLOSURE (listing copy is locked, so restated here every update)
AVIF conversion is opt-in, off by default. Selecting AVIF shows an in-context consent prompt disclosing the image is sent to our first-party Tower service (tower.codalyn.app) for conversion — in memory, never stored; revocable in Settings → Privacy. A persistent disclosure shows while AVIF is active. A hard guard at the single network call site refuses AVIF without consent, so no path (previews, size estimates, saved presets) sends image bytes unconsented. WebP stays fully in-Designer.
```

### Published-runtime test — paragraph for the notes (paste with §4)

```
PUBLISHED-RUNTIME TEST NOTES
- Beacon applies exactly one script to a page: the hosted runtime registered with a SHA-256 integrityHash and applied through the Custom Code API. It creates no script elements, performs no dynamic import, and makes no network requests (pinned by unit test on the generated source).
- The page tag Webflow renders for it is <script src="https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/6aa881c9d6e9e70f262ea057_codalyn-beacon-runtime-1ebc5741.js" integrity="sha256-bzvg9YjCBFqQA0VVsDdcsIK0DUK5RSCi9mefHtVXldM=" crossorigin="anonymous">; the served bytes (20153, SHA-256 6f3be0f588c2045a90034555b0375cb082b40d42b94520a2f6679f1ed55795d3) hash to that SRI under Preflight's own curl/shasum/openssl steps, with or without an Origin header, for identity, gzip and br encodings, and the CDN answers Access-Control-Allow-Origin: *. Preflight's browser test reports "Script integrity is missing or wrong" for this file with the same URL, SHA-256 and derived SRI in the package, while its own row says Loaded and Hash matched. We have now observed this on three successive pins of this runtime — the original, one whose base64 contains no "/" or "+", and the current pure-ASCII file (no charset-sensitive bytes; the CDN sends no charset) — each carried verbatim in the tag with crossorigin="anonymous" and each executed by the browser (a browser blocks a script whose SRI fails; our ready selector was present). We could not reproduce a mismatch outside the tool and would welcome the value it observed.
- The runtime is served unminified and formatted, with a header naming its version and authoring module (apps/beacon/src/features/cms-slots/model/cms-slot-page-inline-script.ts). There is no build transform, so the served file is its own readable source and no separate source map exists; the same modules are in the private source-map zip attached to this submission.
- Every other script the test page loads is Webflow's own published-site runtime (js/webflow.<site>.<hash>.js and the webflow.achunk.* chunks it imports, plus GSAP/ScrollTrigger when Interactions are present), rendered by Webflow on every published page. None is loaded by Beacon.
```

## 2026-09-15 — filed form text (App Update ref 7875910a-e080-40bc-9eb9-8d523a0e0e6a), replaced by round 8 on 2026-09-17

### §3 Response to the review team (484 chars, as filed)

```
Bundle scan: every request leaves through one egress call (extension-egress.ts) with an explicit destination policy; the release build fails on a second fetch site. The one MutationObserver is Lexical's editor sync inside our panel, never the canvas. Runtime test: Beacon adds one page-level script, pinned by a SHA-256 SRI the tag carries verbatim; served bytes match (Hash matched). It is unminified, so it is its own source. Every other listed script is Webflow's own site runtime.
```

### §4 Additional notes (4930 chars, as filed)

```
WHAT CHANGED
- Bundle v0.1.0 (09-14 18:26). All extension network requests go through one first-party call site (extension-egress.ts) with an explicit destination policy; the release build fails if a second fetch site appears. The one MutationObserver is the rich-text editor's (Lexical) contenteditable sync inside our own panel; it never observes or writes the Designer canvas. Canvas changes happen only through the Designer API on explicit user actions.
- Hosted runtime is pure ASCII (a header em dash and a non-breaking-space sentinel are now a hyphen and a Unicode escape sequence; behaviour unchanged, unit-pinned). Webflow's CDN serves it with no charset, so it hashes identically under every decoding.
- Tower CORS is allowlist-only (no Access-Control-Allow-Origin header for non-allowlisted origins; no wildcard). The shared API-key bearer was removed; every request is attributed to a signed-in user session.
- react-router-dom 7.18.3 (clears published advisories); our patch removing its inline script emission is re-applied.
- Shipped CSP now admits cdn.prod.website-files.com for the extension's own script, stylesheet and fonts (the bundle's install origin). No wildcard, no inline script, connect-src unchanged.
- The last-slot-list deletion hint now tells users to run page uninstall on every page before removing Beacon, and what to delete by hand if the app was removed first.
- No plaintext-HTTP or insecure-websocket URLs, no HTML-injection sinks, no popup or cross-window messaging calls, no credentials in URLs, no session replay. styles.css ships a v3 source map.

PUBLISHED-RUNTIME TEST
- Beacon applies exactly one page-level script, registered via the Custom Code API with a SHA-256 integrityHash; Webflow renders the tag with the integrity attribute and anonymous crossorigin. It creates no script elements, imports nothing and makes no network requests (unit-pinned).
- Runtime file 1 on the test page: https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/6aa881c9d6e9e70f262ea057_codalyn-beacon-runtime-1ebc5741.js. SRI sha256-bzvg9YjCBFqQA0VVsDdcsIK0DUK5RSCi9mefHtVXldM= is carried verbatim in the page tag. Served bytes: 20153, SHA-256 6f3be0f588c2045a90034555b0375cb082b40d42b94520a2f6679f1ed55795d3, identical for identity, gzip and br encodings, with or without an Origin header; the CDN answers a wildcard Access-Control-Allow-Origin. Preflight's row says Loaded and Hash matched but also "SRI mismatch"; the tag carries the exact derived SRI and the browser executed the script (ready selector present), which is impossible if SRI had failed. We saw the same on three successive valid pins (original, slash-free base64, pure ASCII) and could not reproduce outside the tool; we would welcome the value it observed.
- "Not traceable to source": the runtime is served unminified and formatted, with a header naming its version and authoring module (cms-slot-page-inline-script.ts). There is no build transform, so the served file is its own source; the same modules are in the private source-map zip.
- Every other script on the test page is Webflow's own site runtime (the per-site webflow bundle, its achunk imports, GSAP and ScrollTrigger for Interactions, jQuery). None is loaded by Beacon; we pin runtime file 1 only.

BACKEND (Hybrid): https://tower.codalyn.app only, HTTPS, production. Paths: /api/auth/webflow-designer (Designer ID-token exchange, server-side); /api/auth/get-session, sign-in/email, sign-out, one-time-token/generate (our session; the one-time token is consumed by Tower's sign-in handoff, never a Webflow credential); /api/integrations/webflow/authorize (server-stored OAuth state, returns the Webflow consent URL); /api/v1/beacon/ settings, active-workspace, access-policy, usage, early-access-request, support-request; /api/v2/webflow/ (all subpaths: proxy to the Webflow Data API with the server-stored OAuth token, path segments only, fixed upstream host); image conversion (opt-in AVIF only). All require a server-resolved session. The bearer is sent only to the Tower origin; the Webflow ID token is never forwarded to a third party. Also: Webflow-issued presigned upload URLs (S3, website-files.com) for our runtime, no credential header; https://us.i.posthog.com analytics, opt-in only, no site content.

UNINSTALL: page-level code only, never site-level. Deleting the last slot list offers a one-click page uninstall (removes the footer script entry and orphaned runtime assets, prompts to publish). Manual path: Page settings, Custom code, Footer code. Docs: https://tower.codalyn.app/docs.

EXTERNAL-SERVICE DISCLOSURE: AVIF conversion is opt-in, off by default. Selecting AVIF shows a consent prompt disclosing the image is sent to tower.codalyn.app for conversion, in memory, never stored; revocable in Settings, Privacy; persistent indicator while active. A guard at the single call site refuses AVIF without consent. WebP stays fully in-Designer.
```

---

## 2026-09-26 — filed form text (App Update ref 1d3acdf7-fdb1-4e03-8a62-e5016224b64a), replaced by round 9 on 2026-09-28

Review feedback arrived 2026-09-28 (ticket #1197949): one finding with four sub-findings (repeated sign-in
and OAuth after installation; authorize URL minted on gate mount; srcset candidate list; OAuth URL
allowlist ports/credentials; hosted script URL validation). Engineering detail: compliance-record.md Round 9.

### Version notes (Workspace publish dialog, 500 characters), as filed

Version notes for the dialog — **this field is the 500-character one** (the form's notes field is 5000; do not swap
them). Plain text, no angle brackets. The block below is 496 characters including the four pre-filled headings:

```
# New Features
None.

# Changes/Fixes
Answers the 2026-09-17 review: workspace saved only on the user's click, no server default; no telemetry SDK; every request uses redirect mode error; uploads only to the exact create-asset URL; no unsafe-inline, style attributes blocked; cmsLocaleId on every CMS write, localized sites refused.

# Improvements
No MutationObserver in the bundle; release build pins the shipped inventory; v3 source maps for every file.

# Resolution notes
Detail in the form.
```

### Additional notes (form field, 5000 characters), as filed

**Additional notes** (form limit 5000 characters; this is 4995). The form's WAF blocks angle brackets, key-equals-value pairs, DOM API names, `\u00a0` and `/*` — the block below avoids them, paste as is:

```
WHAT CHANGED (bundle v0.1.0, 09-26_12-24-24) - 1 to 6 answer the 2026-09-17 feedback; 7, 8 Preflight scans; 9 our 2026-09-25 audit

1. Workspace state. The effect that posted the single workspace to /api/v1/beacon/active-workspace on sync completion is removed. A user with one workspace and none active sees it as a suggestion with an explicit "Use this workspace" control; the only request to that endpoint comes from that click or the multi-workspace picker. The server sets no default either: an extension session without a chosen workspace stays without one until the user confirms. Unit tests pin zero requests after sync, one after the click, no server fallback.

2. Exception telemetry. The Marketplace build ships no telemetry SDK: the dependency sits behind a build-time release flag that is off for Marketplace bundles; the release build fails if it is on and verifies the zip has no trace of it (no analytics chunk, no telemetry host, no consent prompt). Settings and the privacy policy say so. Builds that enable telemetry run a unit-tested redaction handler on every event.

3. Redirects. The single network call site (extension-egress.ts) runs every request with redirect mode set to error; callers cannot override it. No path needs a redirect: Tower answers directly and the presigned upload returns 2xx with no redirect.

4. Upload allowlist. The create-asset adapter registers the exact uploadUrl Webflow returned as a one-shot permitted destination, only if it names the webflow-prod-assets bucket (host exactly webflow-prod-assets.s3.amazonaws.com, or host s3.amazonaws.com with first path segment webflow-prod-assets). The egress policy accepts an upload only for a granted URL and consumes the grant; every other bucket or host is refused before any request. connect-src names that bucket in both syntaxes, never the bare S3 host.

5. CSP style directives. unsafe-inline is removed: style-src and style-src-elem allow self plus the hosted bundle host; style-src-attr is none. The UI styles through the CSSOM. The two style-attribute writes left are pinned by count and are Designer API calls styling the CMS Slots placeholder on the user's canvas, outside the extension's policy.

6. Localization. Every CMS item write names its locale: the extension reads the site's locales once per session and sends the primary locale's cmsLocaleId on every write and on the matching staged read. Sites with secondary locales are refused before any request. The listing states this.

7. DOM observers. The rich-text property editor is withdrawn behind a release flag like item 2. Rich-text properties are edited as HTML in a text box. The drag-and-drop library's re-measuring observer is removed by a dependency patch. The release build pins the observer identifier to zero across every shipped file.

8. Browser storage and cookies. The session bearer is held in memory only; no storage call in the bundle is keyed by a credential name. Every request sets the cookie mode to omit at the single call site; the only credential on the wire is our Tower session bearer, sent only to tower.codalyn.app.

UNCHANGED FROM 2026-09-15: one network call site with an explicit destination policy; canvas changes only through the Designer API on explicit user action; Tower with allowlist-only CORS, session-only auth, server-stored OAuth state, the Webflow ID token never forwarded; no plaintext-HTTP or insecure-websocket URLs, no HTML-injection sinks, popups, cross-window messaging, credentials in URLs or session replay; every shipped JS and CSS file has a private v3 source map; none names a map.

9. Audit of 2026-09-25 against the guidelines. The canvas clear that ran on Designer mode and page changes is removed: every canvas write now follows a click. Install and rename toasts prompt to publish. The sign-in card names the free plan, that paid plans raise monthly limits, and links pricing. A dependency polyfill that assigned ArrayBuffer.prototype.slice is removed by patch; the build pins native prototype assignments to zero.

PUBLISHED-RUNTIME TEST: one page-level script, registered with a SHA-256 integrityHash carried verbatim in the page tag with anonymous crossorigin; served unminified with a version-3 source map beside it. Every other script on the test page is Webflow's own site runtime; Beacon loads none. The Script integrity row is tool-side: the runner reads the tag at the file's first request, issued by the preload scanner before the parser inserts any script element after jQuery and webflow.js, so the attribute is never read; reproduced locally 3 of 3, also for Webflow's jQuery tag; the served tag and CDN CORS verify correct. The unreviewed rows are Webflow's site runtime on our asset's CDN host.

BACKEND (Hybrid): https://tower.codalyn.app only, HTTPS, production; paths as filed on 2026-09-15; in-app policy and docs links are anchors on it. Other destination: the presigned upload URL in item 4. No telemetry host. Uninstall and AVIF disclosure unchanged.
```
