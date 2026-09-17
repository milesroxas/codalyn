# SUBMIT — paste-ready content for the Webflow review form

Everything on this page is copy-paste. One heading per form field. Nothing here is history or
rationale; that lives in [compliance-record.md](compliance-record.md). Keep this page current for
**one** round only: when a new build is made, update the artifact block and the "what changed"
list, then copy.

Current round: **8 — answering the 2026-09-17 review-team feedback on App Update
`7875910a-e080-40bc-9eb9-8d523a0e0e6a`** (six findings; compliance-record Round 8, R8.1–R8.6). The
filed 2026-09-15 text is in [history/responses.md](history/responses.md). The next bundle goes through
Publish → Upload Bundle for Review in app settings **and** the submit form (App Update), and continues
the same email thread.

## Before you paste (30 seconds)

- [ ] The zip below is the **newest** file in `apps/beacon/bundle/production/public/`.
- [ ] The `wfpre_` receipt came from a Preflight run on **that** zip + its `.sourcemaps.zip`.
- [ ] Source is committed (so the artifact hash maps to a commit).
- [ ] Tower is deployed to Production with the amended privacy policy (§1 "Beacon Designer Extension":
  the Marketplace build includes no analytics SDK) — `apps/tower/src/features/legal/content/privacy-policy.md`.
- [ ] **That** zip is installed on the test site, the Beacon panel renders, and the extension console
  shows no CSP violation (the style policy is now `style-src-attr 'none'`; see compliance-record R8.5).
- [ ] A CMS Slots page runtime **Sync** on the test page still uploads (the presigned upload now goes
  through an exact-URL grant, R8.4) and the site is published; `node scripts/webflow-runtime-observe.mjs <page>` exits 0 (§5).
- [ ] The Marketplace **listing** carries the Localization statement from §6.

## 1. Files to upload

| Form field | File |
| --- | --- |
| Designer Extension bundle | `apps/beacon/bundle/production/public/v0.1.0_public_09-17_17-51-37.zip` |
| Source maps (private field only, never the bundle) | `apps/beacon/bundle/production/public/v0.1.0_public_09-17_17-51-37.sourcemaps.zip` |
| Package manifest + lockfile (required for compiled bundles since the 2026-08-19 guidelines) | `apps/beacon/package.json` + root `pnpm-lock.yaml`, as committed at the build commit |

sha256 · bundle `f0fa56164f0447f4e8498e2933d0c8bff4d65ab2a14abc9add93495dd72a5ac8` ·
sourcemaps `c38f915ea75453b1e92570bb5aeb6fec57b4a6599a4bc24c26d8bab51cf1d246`

Rebuild command if needed: `CI=true BUILD_RECIPIENT=public pnpm --filter beacon build:prod`
(release flags unset = the Marketplace state: no telemetry SDK, no rich-text editor, localized-site
CMS writes blocked).

## 2. App Review Preflight receipt

**Not yet run on the 09-17_17-51-37 artifact.** The scan of the 16:38 build returned **one** REQUIRED item,
External API Calls, with its excerpt on the session-token module's legacy storage cleanup and the Tower
policy-page URLs (compliance-record R8.10); Silent Canvas Mutations was not reported. The 09-17_17-51-37
build removes the storage call and pins the cookie mode to omit on every request (§4 item 8), so the
expected result is:

| Finding | Expected | Why |
| --- | --- | --- |
| External API Calls | **none**, or 1 location whose excerpt is `extensionFetch` itself | the credential-named storage call and the cookie-bearing request mode shown in the 16:38 excerpt are gone; what can remain is the bundle's single backend call — a Hybrid App has one, and no honest change clears that token |
| Silent Canvas Mutations | **none** | not reported on the 16:38 scan; `new MutationObserver(` count in the zip is 0, pinned by the release build |

An independent sweep of the 09-17_17-51-37 zip confirms the inventory: bare `fetch(` ×1, `credentials:` omit
×1 / include ×0, credential-named storage key ×0, `new MutationObserver(` ×0, `setAttribute("style"` ×2,
`lexical` ×0, `posthog` ×0 — see [compliance-record.md](compliance-record.md) R8.10. Any second item,
Silent Canvas Mutations reappearing, or an External API Calls excerpt that is not `extensionFetch` =
stop, see [playbook.md](playbook.md) § B.

Run Preflight on the two files in §1 and paste the `wfpre_` code from **that** run below before filing:

```
wfpre_<pending>
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
| **Listing description — Localization statement (required, R8.6)** | Add verbatim: "Localization: Beacon does not write CMS content on sites that use Webflow Localization (secondary locales). On such sites, CMS writes from the image editor and CMS Slots are refused in-app with a message; nothing is changed. Sites without secondary locales are fully supported, and every CMS write names the site's primary locale explicitly." |
| **Listing description — Privacy statement (R8.2)** | Add or keep: "Beacon sends no usage or error telemetry. AVIF conversion is opt-in and sends only the image being converted to tower.codalyn.app; it is off by default." |
