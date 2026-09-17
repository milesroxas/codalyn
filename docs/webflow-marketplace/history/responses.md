# Earlier reviewer responses (reference only — do not paste)

Bodies that were pasted into the review form's ≤500-character response field in earlier rounds,
newest first. The current one lives in [../SUBMIT.md](../SUBMIT.md) § 3. Engineering detail per
round: [../compliance-record.md](../compliance-record.md).

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

