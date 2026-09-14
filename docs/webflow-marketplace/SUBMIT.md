# SUBMIT — paste-ready content for the Webflow review form

Everything on this page is copy-paste. One heading per form field. Nothing here is history or
rationale; that lives in [compliance-record.md](compliance-record.md). Keep this page current for
**one** round only: when a new build is made, update the artifact block and the "what changed"
list, then copy.

Current round: **7b, 2026-09-14** (App Review Preflight re-scans + first "Test the published runtime"
run; no new reviewer email). Latest findings and their answers: compliance-record R7b.16.

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
| Designer Extension bundle | `apps/beacon/bundle/production/public/v0.1.0_public_09-14_14-50-17.zip` |
| Source maps (private field only, never the bundle) | `apps/beacon/bundle/production/public/v0.1.0_public_09-14_14-50-17.sourcemaps.zip` |
| Package manifest + lockfile (required for compiled bundles since the 2026-08-19 guidelines) | `apps/beacon/package.json` + root `pnpm-lock.yaml`, as committed at the build commit |

sha256 · bundle `9d9e8958fdf4ac33668a716475e6d1d444fc225559b4dda2b086ae8457e37275` ·
sourcemaps `eab413d3443a47cf846e2c3970e4b611da28e8fd66b8bd749e3cc42bffae17f8`

Rebuild command if needed: `CI=true BUILD_RECIPIENT=public pnpm --filter beacon build:prod`

## 2. App Review Preflight receipt

Run Preflight on the two files above. Paste the receipt it issues:

```
wfpre_
```

(Expected **bundle scan** result for this build: two REQUIRED items — External API Calls, 1 location;
Silent Canvas Mutations, 1 location. Both are answered by the text in §3/§4. Anything else = stop, see
[playbook.md](playbook.md) § B. Expected **published-runtime test** result: see §5 — "Runtime is not
traceable to source" is answered by the manual-path paragraph in §4; the Webflow platform scripts are
either pinned in the test package or answered by the same paragraph.)

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
- Hosted runtime script (applied to pages via the Custom Code API) is registered with a SHA-256 SRI over the exact uploaded bytes at an immutable, versioned Webflow asset URL; Webflow renders the tag's integrity and crossorigin="anonymous" from that registration. It loads no other scripts and makes no network requests (unit-pinned).
- The hosted runtime is now served as readable, unminified source (about 630 lines, Biome-formatted) with a header comment naming its version and authoring module. It is not the output of a build transform, so it is its own source: there is no separate source map to publish, and the private source-map zip contains the same modules. The runtime's behaviour is unchanged — the reformat is whitespace-only, verified by the unit tests that execute the generated runtime.
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

### Published-runtime test — paragraph for the notes (paste with §4)

```
PUBLISHED-RUNTIME TEST NOTES
- Beacon applies exactly one script to a page: the hosted runtime registered with a SHA-256 integrityHash and applied through the Custom Code API. It creates no script elements, performs no dynamic import, and makes no network requests (pinned by unit test on the generated source).
- The runtime is served unminified and formatted, with a header naming its version and authoring module (apps/beacon/src/features/cms-slots/model/cms-slot-page-inline-script.ts). There is no build transform, so the served file is its own readable source and no separate source map exists; the same modules are in the private source-map zip attached to this submission.
- Every other script the test page loads is Webflow's own published-site runtime (js/webflow.<site>.<hash>.js and the webflow.achunk.* chunks it imports, plus GSAP/ScrollTrigger when Interactions are present), rendered by Webflow on every published page. None is loaded by Beacon.
```

## 5. "Test the published runtime" (Preflight browser test)

1. Test site: use the **simplest page that has beacons** — no Interactions (IX2/IX3), no custom-code
   embeds, no third-party scripts — so the only non-Beacon JavaScript is Webflow's own site runtime.
   Install the bundle above, then CMS Slots → page runtime **Sync** → **Publish**. (The readable-runtime
   change moved the source hash, so a plain sync also re-registers; **Sync** forces it regardless.)
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
| Versioned runtime URL | `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/6aa844abbb616acbbee14fa2_codalyn-beacon-runtime-0410d012.js` (19:02 UTC push from the 14:50 build; re-run the script after any new Sync + Publish) |
| How runtime file 1 loads | Loaded directly by the published page |
| SHA-256 | `67166d5274a9e9509bf58aac15f7c83c12c798085f627846bed3f2e87fde0fd8` |
| Script integrity (SRI) | `sha256-ZxZtUnSp6VCb9YqsFffIPBLHmAhfYnhGvtPy6H/eD9g=` — the page already carries it with `crossorigin="anonymous"` (verified 2026-09-14) |
| Does your app proxy or fetch another URL for customers? | **No** — Tower never fetches a URL the client supplies (`/api/v2/webflow/*` forwards path segments to the fixed Webflow Data API host; image conversion takes uploaded bytes) |
| Ready selector | `[data-beacon-target="list"][data-cb-rendered="1"]` (set by the runtime per rendered beacon list; page must have one working beacon) |

**Runtime files: fill runtime file 1 (Beacon) only. Do not pin Webflow's own scripts (decision
2026-09-14, compliance-record R7b.16).** Provenance: the published guidelines scope review to "what your
App registers, discloses, and removes through Webflow, not how your published-site runtime behaves", and
Preflight itself is optional in the submission docs; no published requirement asks a partner to declare
Webflow's platform files (`webflow.<site>.<hash>.js`, `webflow.achunk.*`, gsap/ScrollTrigger, jQuery).
Expect the run to keep reporting them as "unreviewed" / "new script elements", plus "not traceable to
source" for our unminified runtime — all three are answered by the paragraph above (§4). Pin the Webflow
rows below **only if a reviewer explicitly asks**; they change on every site publish, so re-run the observe
script first. The `webflow.achunk.*` chunks are content-addressed and identical across Webflow sites
(verified against webflow.com): Webflow's code, not the site's or ours.

If either script exits 1 ("DOES NOT MATCH" / absent integrity), press Sync + Publish again, then re-run.

**Webflow platform rows observed on the page at the 19:02:27 UTC publish** (reference only — paste as
additional runtime files solely if a reviewer asks for them; every value below changes when the site is
re-published, so re-run `webflow-runtime-observe.mjs` and use its "test-package rows" block instead):

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

Not listed, and not flagged by
Preflight last run: the demo template's 7 `cdn.jsdelivr.net` embeds (Mast accordion/modal/slider/
inline-video/tabs/theme-toggle + Swiper 11). They are the test site's own content, not app code; remove
those embed components from the test page only if a reviewer raises them.

## 6. Other form fields

| Field | Value |
| --- | --- |
| Submission type | App Update |
| App name | Beacon |
| New or changed bundle? | Yes |
| Testing site | `https://<test-site>.webflow.io` with this bundle installed via the version manager |
| Reviewer credentials | enter in the form's credentials field only — never in this repo |
| 2FA | enabled on a Workspace admin account before submitting |
