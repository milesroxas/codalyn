# SUBMIT — paste-ready content for the Webflow review form

Everything on this page is copy-paste. One heading per form field. Nothing here is history or
rationale; that lives in [compliance-record.md](compliance-record.md). Keep this page current for
**one** round only: when a new build is made, update the artifact block and the "what changed"
list, then copy.

Current round: **7b, 2026-09-14** (App Review Preflight re-scans; no new reviewer email).

## Before you paste (30 seconds)

- [ ] The zip below is the **newest** file in `apps/beacon/bundle/production/public/`.
- [ ] The `wfpre_` receipt came from a Preflight run on **that** zip + its `.sourcemaps.zip`.
- [ ] Source is committed (so the artifact hash maps to a commit).
- [ ] **That** zip is installed on the test site and the Beacon panel renders (no CSP violation for
  `cdn.prod.website-files.com` in the extension console) — see compliance-record R7b.15.

## 1. Files to upload

| Form field | File |
| --- | --- |
| Designer Extension bundle | `apps/beacon/bundle/production/public/v0.1.0_public_09-14_14-11-16.zip` |
| Source maps (private field only, never the bundle) | `apps/beacon/bundle/production/public/v0.1.0_public_09-14_14-11-16.sourcemaps.zip` |
| Package manifest + lockfile (required for compiled bundles since the 2026-08-19 guidelines) | `apps/beacon/package.json` + root `pnpm-lock.yaml`, as committed at the build commit |

sha256 · bundle `72d12140080a08bc63b47d96d2b7d776608ea150175095965f4ef6f6efadceaa` ·
sourcemaps `1902703d03e365e4135e32e68514219d1cefc2ff1d8f033827571b7ddb7414c6`

Rebuild command if needed: `CI=true BUILD_RECIPIENT=public pnpm --filter beacon build:prod`

## 2. App Review Preflight receipt

Run Preflight on the two files above. Paste the receipt it issues:

```
wfpre_
```

(Expected scan result for this build: two REQUIRED items — External API Calls, 1 location; Silent
Canvas Mutations, 1 location. Both are answered by the text in §3/§4. Anything else = stop, see
[playbook.md](playbook.md) § B.)

## 3. Response to the review team (≤500 characters)

495 characters.

```
Preflight: every request now leaves through one first-party egress call (extension-egress.ts) with an explicit destination policy — our Tower origin, or the Webflow-issued presigned asset-upload URL — mirrored by the shipped CSP; the release build fails on any second fetch site. The one MutationObserver is the rich-text editor's (Lexical) contenteditable sync inside our own panel: created on editor mount, scoped to its root, driven by typing. It never observes or writes the Designer canvas.
```

## 4. Submission notes / changelog (long field)

```
WHAT CHANGED IN THIS UPDATE
- All network requests from the extension go through one first-party call site (extension-egress.ts) with an explicit destination policy; the release build fails if a second call site appears.
- The one MutationObserver in the bundle is the rich-text editor's (Lexical) contenteditable sync inside our own panel. It observes only that editor's root and writes only that editor's DOM. It never observes or writes the Designer canvas; canvas changes happen only through the Designer API behind explicit user actions.
- Hosted runtime script (applied to pages via the Custom Code API) is registered with a SHA-256 SRI over the exact uploaded bytes at an immutable, versioned Webflow asset URL. It loads no other scripts and makes no network requests.
- Fixed: the shipped Content-Security-Policy now admits Webflow's hosted bundle origin (https://cdn.prod.website-files.com) for the extension's own scripts, stylesheet and fonts. The previous 'self'-only policy blocked them once installed, leaving the panel blank. No wildcard, no inline script, no new third-party host; connect-src unchanged.
- styles.css ships a version-3 source map from the same build. No http:// or ws:// URLs, no innerHTML writes, no window.open, no postMessage, no credentials in URLs, no session replay.

BACKEND DOMAINS AND ENDPOINTS (Hybrid App)
- https://tower.codalyn.app (first-party backend, HTTPS, production only)
  - /api/auth/webflow-designer — Designer ID-token exchange (server-side; issues our session)
  - /api/v2/webflow/* — proxy to the Webflow Data API using the OAuth token stored server-side
  - image conversion endpoint — opt-in AVIF only (see below)
- Webflow-issued presigned asset-upload URLs (S3 / website-files.com) — direct upload of our runtime script; no credential header.
- https://us.i.posthog.com — product analytics, opt-in only, no site content.
- The Authorization bearer is sent only to the Tower origin (exact-origin match at the single call site). The Webflow ID token is never forwarded to a third party.

EXTERNAL-SERVICE DISCLOSURE (listing copy is locked, so restated here every update)
AVIF conversion is opt-in, off by default. Selecting AVIF shows an in-context consent prompt disclosing the image is sent to our first-party Tower service (tower.codalyn.app) for conversion — in memory, never stored; revocable in Settings → Privacy. A persistent disclosure shows while AVIF is active. A hard guard at the single network call site refuses AVIF without consent, so no path (previews, size estimates, saved presets) sends image bytes unconsented. WebP stays fully in-Designer.
```

## 5. "Test the published runtime" (Preflight browser test)

1. Test site: install beacons on a page → CMS Slots → press the page runtime **Sync** button →
   **Publish**.
2. Run and copy the output into the form:

```bash
node scripts/webflow-runtime-pin.mjs https://<test-site>.webflow.io/<page-with-beacons>
```

| Form field | Value |
| --- | --- |
| Published Webflow test URL | the page URL you passed above |
| Webflow installation or site ID | prefilled by Preflight (`6a35c562c551e2eb11bc4f1c` on 2026-09-14) |
| Versioned runtime URL | `Versioned runtime URL` line from the script |
| How runtime file 1 loads | Loaded directly by the published page |
| SHA-256 | `SHA-256` line from the script (64 lowercase hex) |
| Script integrity (SRI) | calculated by the form; must equal the script's `Script integrity` line |
| Does your app proxy or fetch another URL for customers? | **No** — Tower never fetches a URL the client supplies (`/api/v2/webflow/*` forwards path segments to the fixed Webflow Data API host; image conversion takes uploaded bytes) |
| Ready selector | `[data-beacon-target="list"][data-cb-rendered="1"]` (set by the runtime per rendered beacon list; page must have one working beacon) |

Exactly one runtime file. If the script exits 1 ("DOES NOT MATCH"), press Sync + Publish again.

## 6. Other form fields

| Field | Value |
| --- | --- |
| Submission type | App Update |
| App name | Beacon |
| New or changed bundle? | Yes |
| Testing site | `https://<test-site>.webflow.io` with this bundle installed via the version manager |
| Reviewer credentials | enter in the form's credentials field only — never in this repo |
| 2FA | enabled on a Workspace admin account before submitting |
