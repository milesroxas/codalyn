# SUBMIT — paste-ready content for the Webflow review form

Everything on this page is copy-paste. One heading per form field. Nothing here is history or
rationale; that lives in [compliance-record.md](compliance-record.md). Keep this page current for
**one** round only: when a new build is made, update the artifact block and the "what changed"
list, then copy.

Current round: **7b, 2026-09-14** (App Review Preflight re-scans + three "Test the published runtime"
runs; no new reviewer email). Latest findings and their answers: compliance-record R7b.16; the 16:43
rebuild and the backend fixes that go with it are R7b.17; the 17:03 rebuild (URL-safe runtime SRI experiment) is R7b.18.

## Before you paste (30 seconds)

- [ ] The zip below is the **newest** file in `apps/beacon/bundle/production/public/`.
- [ ] The `wfpre_` receipt came from a Preflight run on **that** zip + its `.sourcemaps.zip`.
- [ ] Source is committed (so the artifact hash maps to a commit).
- [ ] **That** zip is installed on the test site and the Beacon panel renders (no CSP violation for
  `cdn.prod.website-files.com` in the extension console) — see compliance-record R7b.15.
- [ ] The test page's runtime was re-pushed **from that zip** (CMS Slots → page runtime **Sync**) and the
  site published; `node scripts/webflow-runtime-observe.mjs <page>` exits 0 (§5).

## 1. Files to upload

| Form field | File |
| --- | --- |
| Designer Extension bundle | `apps/beacon/bundle/production/public/v0.1.0_public_09-14_17-03-17.zip` |
| Source maps (private field only, never the bundle) | `apps/beacon/bundle/production/public/v0.1.0_public_09-14_17-03-17.sourcemaps.zip` |
| Package manifest + lockfile (required for compiled bundles since the 2026-08-19 guidelines) | `apps/beacon/package.json` + root `pnpm-lock.yaml`, as committed at the build commit |

sha256 · bundle `a89ec9e35eb32bb1d25052b083c8c6ea08590d9bb33ff4c882dd9474e9bec0cf` ·
sourcemaps `bf957ee728372e6a81fec1541cf89f9999ef22c706f8375efe19b53f2fd8c725`

Rebuild command if needed: `CI=true BUILD_RECIPIENT=public pnpm --filter beacon build:prod`

## 2. App Review Preflight receipt

**Pending for the 17:03 build.** Receipts are bound to the exact zip: `wfpre_5a2242e8a2e87aeb307efde92bd51bc0`
(16:43 build, sha256 `07b52d49…3d2e`) and `wfpre_d7c0944a2b2df172d989a97931230b21` (14:50 build) do not
reconcile with the files above. Run the bundle scan on the 17:03 zip + its `.sourcemaps.zip` and paste the
new code here before filing. Expected bundle-scan result is unchanged (External API Calls 1, Silent Canvas
Mutations 1); the only source change is one header comment line in the published runtime
(compliance-record R7b.18).

```
wfpre_<pending — run Preflight on the 17:03 artifacts>
```

## 3. Response to the review team (≤500 characters)

495 characters.

```
Preflight: every request now leaves through one first-party egress call (extension-egress.ts) with an explicit destination policy — our Tower origin, or the Webflow-issued presigned asset-upload URL — mirrored by the shipped CSP; the release build fails on any second fetch site. The one MutationObserver is the rich-text editor's (Lexical) contenteditable sync inside our own panel: created on editor mount, scoped to its root, driven by typing. It never observes or writes the Designer canvas.
```

## 4. Submission notes / changelog (long field)

```
WHAT CHANGED IN THIS UPDATE
- Published-site runtime: one header comment line added ("Runtime revision 2") so the runtime's SHA-256 SRI contains only [A-Za-z0-9=] (no "/" or "+"). Behaviour unchanged (unit tests execute the generated runtime); a unit test now keeps the pin URL-safe on every future revision. Motivation: Preflight's runtime test reported an SRI mismatch for a pin that matched byte-for-byte; the only distinguishing feature of that pin was a "/" in its base64.
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
- The page tag Webflow renders for it is <script src="<versioned URL — fill from `node scripts/webflow-runtime-pin.mjs` after Sync + Publish>" integrity="sha256-BHxwQ8J6KUu1ZFGhGRjZAAxOrznK50xJTb0mUmHNgCM=" crossorigin="anonymous">; the served bytes (20104, SHA-256 047c7043c27a294bb56451a11918d9000c4eaf39cae74c494dbd265261cd8023) hash to that SRI under Preflight's own curl/shasum/openssl steps, with or without an Origin header, for identity, gzip and br encodings, and the CDN answers Access-Control-Allow-Origin: *. Preflight's browser test still reports "Script integrity is missing or wrong" for this file with the same URL, SHA-256 and derived SRI in the package; we could not reproduce a mismatch outside the tool and would welcome the value it observed.
- The runtime is served unminified and formatted, with a header naming its version and authoring module (apps/beacon/src/features/cms-slots/model/cms-slot-page-inline-script.ts). There is no build transform, so the served file is its own readable source and no separate source map exists; the same modules are in the private source-map zip attached to this submission.
- Every other script the test page loads is Webflow's own published-site runtime (js/webflow.<site>.<hash>.js and the webflow.achunk.* chunks it imports, plus GSAP/ScrollTrigger when Interactions are present), rendered by Webflow on every published page. None is loaded by Beacon.
```

## 5. "Test the published runtime" (Preflight browser test)

1. Test site: a page with working beacons and no custom-code embeds or third-party scripts, so the only
   non-Beacon JavaScript is Webflow's own site runtime (the template's jsdelivr embeds were removed from
   the test page on 2026-09-14; GSAP/ScrollTrigger stay because Webflow renders them in `<head>` for
   Interactions — not removable from page code). Install the bundle above, then CMS Slots → page runtime
   **Sync** → **Publish**.
2. Observe what the page actually runs — this is a local stand-in for Preflight's browser test:

```bash
node scripts/webflow-runtime-observe.mjs https://<test-site>.webflow.io/<page-with-beacons>
```

   It lists every script the page executed (served-HTML tags, elements created after page start, module
   imports) with SHA-256/SRI, who requested it, and a Beacon / Webflow platform / other label; checks the
   Beacon tag's `integrity` against the served bytes and prints `crossorigin`; ends with a "test-package
   rows" block. Exit 0 = the Beacon runtime is pinned correctly. Requirements before filling the form:
   "Scripts requested by the Beacon runtime: 0", "neither Webflow platform nor Beacon: 0", ready selector
   present. If `integrity` is **absent** after a fresh Sync + Publish, Webflow is not rendering the
   registered integrityHash on page-level scripts — record the observation in the compliance doc and say
   so in the notes; nothing in the app can add the attribute.
3. Static cross-check (what the form derives its SRI from):

```bash
node scripts/webflow-runtime-pin.mjs https://<test-site>.webflow.io/<page-with-beacons>
```

| Form field | Value |
| --- | --- |
| Published Webflow test URL | `https://beacon-demo.webflow.io/blog/the-power-of-resilience` |
| Webflow installation or site ID | prefilled by Preflight (`6a35c562c551e2eb11bc4f1c` on 2026-09-14) |
| Versioned runtime URL | `<fill from node scripts/webflow-runtime-pin.mjs after CMS Slots → Sync → Publish on the 17:03 build; file name ends in codalyn-beacon-runtime-a92b64ed.js>` |
| How runtime file 1 loads | Loaded directly by the published page |
| SHA-256 | `047c7043c27a294bb56451a11918d9000c4eaf39cae74c494dbd265261cd8023` (20104 bytes) |
| Script integrity (SRI) | `sha256-BHxwQ8J6KUu1ZFGhGRjZAAxOrznK50xJTb0mUmHNgCM=` — URL-safe (no `/` or `+`); confirm the page tag carries it with `crossorigin="anonymous"` via the pin script before running the test |
| Does your app proxy or fetch another URL for customers? | **No** — Tower never fetches a URL the client supplies (`/api/v2/webflow/*` forwards path segments to the fixed Webflow Data API host; image conversion takes uploaded bytes) |
| Ready selector | `[data-beacon-target="list"][data-cb-rendered="1"]` (set by the runtime per rendered beacon list; page must have one working beacon) |
| Runtime file results, last run | 16:43 build (pin `…6H/eD9g=`): Loaded ✓ · Hash matched ✓ · SRI mismatch ✗ · No source map ✗. 17:03 build (URL-safe pin): not yet run — if SRI now passes, delete the SRI-mismatch sentences from §4; if it still fails, keep them (two distinct valid pins rejected = tool-side, R7b.18) |

**Runtime files: fill runtime file 1 (Beacon) only. Do not pin Webflow's own scripts (decision
2026-09-14, compliance-record R7b.16).** Provenance: the published guidelines scope review to "what your
App registers, discloses, and removes through Webflow, not how your published-site runtime behaves", and
Preflight itself is optional in the submission docs; no published requirement asks a partner to declare
Webflow's platform files (`webflow.<site>.<hash>.js`, `webflow.achunk.*`, gsap/ScrollTrigger, jQuery).
Expect the run to keep reporting them as "unreviewed" / "new script elements", "not traceable to
source" for our unminified runtime, and "Script integrity is missing or wrong" on our runtime (tool-side:
Preflight's own row says Hash matched, and the page tag carries the exact SRI) — all four are answered by
the paragraph above (§4). Pin the Webflow rows below **only if a reviewer explicitly asks**; they change on every site publish, so re-run the observe
script first. The `webflow.achunk.*` chunks are content-addressed and identical across Webflow sites
(verified against webflow.com): Webflow's code, not the site's or ours.

If either script exits 1 ("DOES NOT MATCH" / absent integrity), press Sync + Publish again, then re-run.

**Webflow platform rows observed on the page at the 19:02:27 UTC publish, unchanged after the embed
removal publish later that day** (reference only — paste as additional runtime files solely if a reviewer
asks for them; every value below can change when the site is re-published, so re-run
`webflow-runtime-observe.mjs` and use its "test-package rows" block instead):

| Versioned runtime URL | How it loads | SHA-256 |
| --- | --- | --- |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.049b2302.3c18d83945b06000.js` | Loaded directly by the published page | `1c3c4ee4f9a82bc4255bd4f427597585726e0f303961dbb814e88a71e99d8573` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.22b66e874d42861f.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `7ca0ff5643a44cc9e6064ac82a22de24c906962a533224000861d68d0a59b451` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.2315c5f26dfe2bfd.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `fc2646e2b573d5b69ad0bfe6eaecf2adec05b93aecf4a3ac6422e4e0e0d1a62a` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.2aaad8b9b407aaec.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `3c665380a8ec94e99c5f4b50680adbb05315ca4b2aaf43de9644062dc29bc093` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.40144d8322818807.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `a2f6adedb14ae9f040ba4d7f091e63382fef1ea61da3f6800fd819e3bd60d9d1` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.43f4d187dbb3f1f5.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `38269af670afb18e457334353e5bfdcd4269462589083eab722c2f9ced71d53d` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.496d56dd8c063ec0.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `61f96d33eb412c13b56791c76ead48cfee4777b780be49e0c13d10ac2774dd3b` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.5959ac50b3c857f1.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `188fda5fe1c48401a0e1a9da355668fe960781435153380a08604dfe73f399da` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.64873797e35e968c.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `75302eb25693db697503c777280f40abc1d74ea83d441ab6c0ab073572399c7b` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.65add74e46fe5245.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `b7e97fd075138494c3b1dd2d042317b5f32dbd68d6a444bb195b90a11aff64f1` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.7459dc3931e7b310.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `21f3b439c6f4bbb6ccf317d26087641c94a6d8fa5b8c5a1ac4d3daa35350633a` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.ad6dcd2fc75b294c.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `08f4ec04403306a8551208e13a438a3e32694815c398e1fb71d1e5182935dee3` |
| `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/js/webflow.achunk.db80639074bc0296.js` | Loaded by another pinned runtime (webflow.049b2302.3c18d83945b06000.js) | `0e1e5e2caf9990969a70b433524e579a793b5dd41ee9af05866b30760afe2c63` |
| `https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js` | Loaded directly by the published page | `92bb9a96476f983d212a2bc4f54c889039c1696dd4461d40a736860938570fbb` |
| `https://cdn.prod.website-files.com/gsap/3.15.0/ScrollTrigger.min.js` | Loaded directly by the published page | `b0b14d67b55b0c43c756ac0b106cfcb09d0879945f6ead64451065b0672916a2` |
| `https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=6a35c562c551e2eb11bc4f1c` | Loaded directly by the published page | `f7f6a5894f1d19ddad6fa392b2ece2c5e578cbf7da4ea805b6885eb6985b6e3d` |

Removed from the test page on 2026-09-14 (never flagged by Preflight): the demo template's 7
`cdn.jsdelivr.net` embeds (Mast accordion/modal/slider/inline-video/tabs/theme-toggle + Swiper 11). The
page now loads exactly the 17 scripts above: Beacon's runtime plus Webflow's own 16.

## 6. Other form fields

| Field | Value |
| --- | --- |
| Submission type | App Update |
| App name | Beacon |
| New or changed bundle? | Yes |
| Testing site | `https://beacon-demo.webflow.io` — bundle above installed via the version manager; beacon page `https://beacon-demo.webflow.io/blog/the-power-of-resilience` |
| Reviewer credentials | enter in the form's credentials field only — never in this repo |
| 2FA | enabled on a Workspace admin account before submitting |
