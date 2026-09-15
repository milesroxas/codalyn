# SUBMIT — paste-ready content for the Webflow review form

Everything on this page is copy-paste. One heading per form field. Nothing here is history or
rationale; that lives in [compliance-record.md](compliance-record.md). Keep this page current for
**one** round only: when a new build is made, update the artifact block and the "what changed"
list, then copy.

Current round: **7b — SUBMITTED 2026-09-15**, Webflow reference ID `7875910a-e080-40bc-9eb9-8d523a0e0e6a`
(compliance-record R7b.20). Everything below is what was filed; do not edit until the review thread
answers. Next bundle goes through Publish → Upload Bundle for Review and continues the same thread. Latest findings and their answers: compliance-record R7b.16; the 16:43
rebuild and the backend fixes that go with it are R7b.17; the 17:03 rebuild (URL-safe runtime SRI experiment) is R7b.18; the 18:26 rebuild (pure-ASCII runtime) is R7b.19.

## Before you paste (30 seconds)

- [ ] The zip below is the **newest** file in `apps/beacon/bundle/production/public/`.
- [ ] The `wfpre_` receipt came from a Preflight run on **that** zip + its `.sourcemaps.zip`.
- [ ] Source is committed (so the artifact hash maps to a commit).
- [ ] Tower is deployed to Production at commit 302edc7 or later — the notes below claim allowlist-only
  CORS and session-only auth; a reviewer probing `tower.codalyn.app` must see that behaviour.
- [ ] **That** zip is installed on the test site and the Beacon panel renders (no CSP violation for
  `cdn.prod.website-files.com` in the extension console) — see compliance-record R7b.15.
- [ ] The test page's runtime was re-pushed **from that zip** (CMS Slots → page runtime **Sync**) and the
  site published; `node scripts/webflow-runtime-observe.mjs <page>` exits 0 (§5).

## 1. Files to upload

| Form field | File |
| --- | --- |
| Designer Extension bundle | `apps/beacon/bundle/production/public/v0.1.0_public_09-14_18-26-19.zip` |
| Source maps (private field only, never the bundle) | `apps/beacon/bundle/production/public/v0.1.0_public_09-14_18-26-19.sourcemaps.zip` |
| Package manifest + lockfile (required for compiled bundles since the 2026-08-19 guidelines) | `apps/beacon/package.json` + root `pnpm-lock.yaml`, as committed at the build commit |

sha256 · bundle `91b888476645008d8bbe4a65dbb1a3f8ef58f8df3411df43cafb4213687b99fd` ·
sourcemaps `0684d1861a2b074552bfed856a92c32b1bf7620360d7f5d48f6adef4b4be01ea`

Rebuild command if needed: `CI=true BUILD_RECIPIENT=public pnpm --filter beacon build:prod`

## 2. App Review Preflight receipt

Issued 2026-09-14 by the Preflight run on the two files above (bundle `91b88847…99fd` + sourcemaps
`0684d186…01ea`). Paste as-is:

```
wfpre_375fcf1295cce47dcb2930eeb7b7dd57
```

(Expected **bundle scan** result for this build: two REQUIRED items — External API Calls, 1 location;
Silent Canvas Mutations, 1 location. Both are answered in §3/§4. Anything else = stop, see
[playbook.md](playbook.md) § B. Superseded receipts: `wfpre_dd6e03bf…` (earlier run on this same 18:26 zip — Preflight reissued on
re-upload; both bind to bundle `91b88847…`), `wfpre_5a2242e8…` (16:43 build), `wfpre_d7c0944a…` (14:50
build).)

## 3. Response to the review team (≤500 characters)

484 characters (the 18:26 runtime test still reports "SRI mismatch"; see §4 for the evidence).

```
Bundle scan: every request leaves through one egress call (extension-egress.ts) with an explicit destination policy; the release build fails on a second fetch site. The one MutationObserver is Lexical's editor sync inside our panel, never the canvas. Runtime test: Beacon adds one page-level script, pinned by a SHA-256 SRI the tag carries verbatim; served bytes match (Hash matched). It is unminified, so it is its own source. Every other listed script is Webflow's own site runtime.
```

How to defend each item if asked (one line each; the long version is in §4):
- **External API Calls (1)** — that one `fetch(` is the chokepoint; its allowlist is the Tower origin or the Webflow-issued presigned upload URL, mirrored by the shipped CSP.
- **Silent Canvas Mutations (1)** — Lexical's contenteditable observer, created on editor mount, scoped to the editor root inside our iframe; the Designer canvas is only changed through the Designer API on explicit user actions.
- **Script integrity** — the tag carries the exact derived SRI with crossorigin="anonymous"; the CDN serves the same bytes for every encoding with ACAO *; the browser executed it (ready selector present), which is impossible if SRI failed in the browser.
- **New / unreviewed scripts** — all are Webflow's published-site runtime (webflow.<site>.js, its achunk imports, GSAP for Interactions); Beacon requests zero scripts (unit-pinned).
- **Not traceable to source** — the runtime is served unminified; the file is the source. The same modules are in the private source-map zip.

## 4. Additional notes (form field, max 5000 characters)

4930 characters. Paste the whole block.

**WAF rule (2026-09-15):** the form backend sits behind Cloudflare and blocked a submission whose notes
contained an HTML script tag, attribute pairs like `src=` / `integrity=`, DOM-sink names (innerHTML,
window.open, postMessage, document.write), a `\u00a0` escape and `/*`. Keep this block free of angle
brackets, key=value attribute pairs, JS API names and comment/wildcard tokens; describe them in words.

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

(The long-form version this replaces is in [history/responses.md](history/responses.md) under 2026-09-15.)

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
| Versioned runtime URL | `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/6aa881c9d6e9e70f262ea057_codalyn-beacon-runtime-1ebc5741.js` (pushed from the 18:26 build; verified 2026-09-14 by pin script + observe script) |
| How runtime file 1 loads | Loaded directly by the published page |
| SHA-256 | `6f3be0f588c2045a90034555b0375cb082b40d42b94520a2f6679f1ed55795d3` (20153 bytes, pure ASCII) |
| Script integrity (SRI) | `sha256-bzvg9YjCBFqQA0VVsDdcsIK0DUK5RSCi9mefHtVXldM=` — the page tag carries it with `crossorigin="anonymous"` (verified 2026-09-14) |
| Does your app proxy or fetch another URL for customers? | **No** — Tower never fetches a URL the client supplies (`/api/v2/webflow/*` forwards path segments to the fixed Webflow Data API host; image conversion takes uploaded bytes) |
| Ready selector | `[data-beacon-target="list"][data-cb-rendered="1"]` (set by the runtime per rendered beacon list; page must have one working beacon) |
| Runtime file results, last run (2026-09-14, 18:26 build, bound to bundle 91b88847…) | Loaded ✓ · Hash matched ✓ · SRI mismatch ✗ · No source map ✗ — expected. Third distinct valid pin rejected (original, slash-free, pure ASCII); the first two flags prove the package matches the served bytes; all four are answered in §4. Do not iterate the page for them (compliance-record R7b.19). |

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
