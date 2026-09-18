# SUBMIT — Round 8 runbook (App Update answering the 2026-09-17 review feedback)

**Build under review:** `v0.1.0_public_09-17_20-41-41.zip` (built 2026-09-17 20:41). Everything on this page is for this build only.
Why each thing is the way it is: [compliance-record.md](compliance-record.md) Round 8, R8.1–R8.12.
Anything Preflight shows that is not listed under step 4 or step 5 below → stop and follow [playbook.md](playbook.md) § B.

## What the six findings became in code

Every finding is a code change you can point to; none is answered with an explanation alone.

| # | Review finding | What changed | Where |
| --- | --- | --- | --- |
| 1 | Workspace persisted without user interaction | Auto-POST effect deleted; a single workspace is only a local suggestion with a **Use this workspace** button. Tower no longer defaults a workspace onto extension sessions (bearer sessions resolve with no membership fallback and no write) | Beacon `settings/model/beacon-app-settings-provider.tsx`, `settings/ui/beacon-workspace-control.tsx` · Tower `server/resolve-active-organization-id.ts`, `server/billing/session-org.ts`, `server/beacon-settings-context.ts` |
| 2 | Telemetry without redaction | Redaction handler wired as PostHog `before_send`, unit-tested with synthetic secrets. On top: the Marketplace build ships no telemetry SDK at all (release flag off; build gate forbids any trace) | `shared/lib/telemetry-event-redaction.ts`, `shared/lib/init-observability.ts`, `shared/lib/beacon-release-flags.ts` |
| 3 | Redirects followed | `redirect` pinned to `error` at the single fetch site; callers cannot override | `shared/lib/extension-egress.ts` |
| 4 | Any S3 bucket accepted | Exact `uploadUrl` granted once per create-asset response; CSP connect-src names Webflow's bucket only (`https://webflow-prod-assets.s3.amazonaws.com`, the form production returns, plus the path-style form the docs show), never the bare S3 host | `shared/lib/extension-egress.ts`, `shared/lib/webflow-asset-upload-endpoint.ts`, `shared/lib/beacon-extension-csp.ts` |
| 5 | `unsafe-inline` styles | Removed; `style-src-attr 'none'`; every Storybook story rendered under the enforced policy with zero Beacon violations | `shared/lib/beacon-extension-csp.ts`, `apps/beacon/scripts/csp-style-audit.mjs` |
| 6 | No locale on CMS writes | `cmsLocaleId` (primary locale) on every CMS write and the staged read; sites with secondary locales are refused before any request; listing states it | `shared/lib/webflow-cms-write-locale.ts`, image-editor `apply-cropped-export.ts`, cms-slots `cms-slot-list-cms-composition-save.ts` |

## What this build does about each Preflight item

| Preflight item | Cause | This build |
| --- | --- | --- |
| External API Calls (bundle scan) | The one backend call (Tower). Webflow's docs put script registration and CMS writes on the backend; the Designer API has no such surface | Stays. Disclosed in the notes (BACKEND paragraph). Not raised by the human review team in round 8 |
| Runtime is not traceable to source | No source map behind the runtime | **Fixed.** Sync uploads a v3 identity source map beside the runtime; the runtime's last line points at it |
| Script integrity is missing or wrong | Unknown tool internals. Tag, CORS and bytes verified correct; the one untested cause was the file's trailing newline | The runtime now ends with the map pointer, no trailing newline. If it persists: download the run's 8 evidence artifacts before changing anything else |
| New script elements / Unreviewed scripts | Webflow's own site runtime plus what the page's Interactions pull in (GSAP, ScrollTrigger, achunks) | Test on a bare page (Step 3) so only Webflow's site runtime remains. Pinning Webflow's files would only move them into the SRI item |

## Do these in order

### Step 1 — Deploy Tower (finding 1 is partly server-side)

From the repo root, signed in to the Vercel account that owns `codalyn-tower`:

```bash
vercel deploy --prod --yes
pnpm --filter tower db:migrate:prod -- --confirm   # applies migration 0037 (R8.11); needs NEON_PROJECT_ID + TOWER_NEON_BRANCH_PROD (or TOWER_DATABASE_URL_PROD)
```

Check: `https://tower.codalyn.app/privacy` § 1 says the Marketplace build includes no analytics SDK.

### Step 2 — Commit

Beacon CSP change, Tower workspace change, their tests and these docs are uncommitted. Commit before uploading anything, so the artifact hash maps to a commit.

### Step 3 — Install the bundle on the test site and push the runtime

1. Webflow → Apps & integrations → Beacon → version manager → upload
   `apps/beacon/bundle/production/public/v0.1.0_public_09-17_20-41-41.zip`.
2. Open Beacon on **beacon-demo**. The panel must render; the extension console must show **no CSP violation**.
3. Sign in. With one workspace you must see **Use this workspace** — click it.
   If the workspace is already active without a click, Tower is not deployed yet → Step 1.
4. **Test page.** Prefer a bare page: a new blank page with one working beacon list, no Interactions, no
   template components, no embeds. Webflow's site runtime still loads (it is on every page), but GSAP,
   ScrollTrigger and most `achunk` files disappear from Preflight's "unreviewed" list. If you keep
   `/blog/the-power-of-resilience`, expect those files to be listed again.
5. CMS Slots → page runtime **Sync** on that page. It must succeed. This Sync uploads **two** assets — the
   source map (`codalyn-beacon-runtime-<hash>.map.json`), then the runtime JS — both through the presigned
   upload under the new `connect-src`. Watch the extension console:
   - a `connect-src` violation or an "Extension egress refused" error → Webflow's `uploadUrl` is neither
     `https://webflow-prod-assets.s3.amazonaws.com/` (what production returned on 2026-09-17) nor the
     documented path-style form; copy the exact URL from the error into the compliance record before
     touching anything;
   - a "runtime source map upload failed" warning → Webflow refused the `.map.json` asset; the runtime still
     installed, without a map pointer. Copy the warning's error into the compliance record.
6. **Publish** the site.
7. Confirm the page from the terminal (replace the URL if you used a bare page):

```bash
node scripts/webflow-runtime-observe.mjs https://beacon-demo.webflow.io/blog/the-power-of-resilience   # must exit 0: Beacon requested 0 scripts, integrity matches
node scripts/webflow-runtime-pin.mjs     https://beacon-demo.webflow.io/blog/the-power-of-resilience   # must exit 0: "✓ matches", "trailing newline: no", source map "✓ v3"
```

The runtime changed in this build (revision 4 + map pointer), so the pin script prints a **new** file name,
SHA-256 and SRI. Those printed values are what Step 5 needs — copy them from the output.

### Step 4 — App Review Preflight: bundle scan

Open **App Review Preflight** in the Designer ([install it into the Workspace](https://webflow.com/oauth/authorize?response_type=code&client_id=0b5411e62233387925e082350666ef374377f81a9abba0dcc2542d6b5b1e4388&scope=authorized_user%3Aread) if it is missing).

1. Upload both files from `apps/beacon/bundle/production/public/`:
   - bundle → `v0.1.0_public_09-17_20-41-41.zip`
   - source maps → `v0.1.0_public_09-17_20-41-41.sourcemaps.zip`
2. Expected **Review feedback: exactly one item, "External API Calls" (REQUIRED), 1 evidence location** in `assets/label-*.js`.
   That is the extension's single backend call (Hybrid App: Tower). It cannot go away while the app has a backend; the notes in Step 6 disclose it. The excerpt's position moves between scans (it has sat on the storage cleanup, then on the Tower policy-page links) — the rule is the same.
3. Anything else — a second item, "Silent Canvas Mutations", an External API Calls excerpt outside the `label-*.js` chunk — → stop, [playbook.md](playbook.md) § B.
4. Copy the receipt code (`wfpre_…`) into Step 6. (It was issued with this item present on 09-14.)

### Step 5 — App Review Preflight: "Test the published runtime"

Fill exactly these values, save the test setup (it binds to the uploaded bundle), run the test.

| Field | Paste |
| --- | --- |
| Published Webflow test URL | `https://beacon-demo.webflow.io/blog/the-power-of-resilience` — or the bare page from Step 3 |
| Webflow installation or site ID | prefilled by Preflight — `6a35c562c551e2eb11bc4f1c` |
| Runtime file 1 — Versioned runtime URL | the `Versioned runtime URL` line the pin script printed in Step 3 (`…codalyn-beacon-runtime-<new hash>.js`; the 09-14 file `…1ebc5741.js` is superseded) |
| How runtime file 1 loads | **Loaded directly by the published page** |
| SHA-256 | the `SHA-256` line the pin script printed |
| Script integrity (SRI) | derived by the form — must equal the `Script integrity (SRI)` line the pin script printed |
| More runtime files | leave empty — Webflow's own scripts are not pinned (decision R7b.16) |
| Does your app proxy or fetch another URL for customers? | **No** |
| Ready selector | `[data-beacon-target="list"][data-cb-rendered="1"]` |

Expected result for this build, and what to do with each item:

| Result | Expected now | If it shows |
| --- | --- | --- |
| Runtime is not traceable to source | **Gone** — the runtime's last line points at the uploaded v3 source map | The pin script's `source map` line tells you why (no trailer = map upload refused; unreachable = CDN). Copy it into the compliance record. |
| Script integrity is missing or wrong | Unknown — the last untested cause (trailing newline) is removed in this build | Do **not** change the runtime again. Expand "Evidence artifact details", download all 8 artifacts, and share them: they show what the tool compared. |
| New script elements · Unreviewed scripts | Only Webflow's site runtime (`webflow.<site>.<hash>.js`, maybe jQuery / an achunk) on a bare page; the full list on the blog page | Expected. Webflow's own files on every Webflow page; pinning them only moves them into the SRI item. Answered in the notes. |

Runtime file row should read **Loaded ✓ · Hash matched ✓ · Source map ✓**; SRI is the open question above.
If a reviewer explicitly asks for Webflow's platform scripts to be pinned: [history/webflow-platform-script-rows-2026-09-14.md](history/webflow-platform-script-rows-2026-09-14.md) — re-run the observe script first, the values change on every publish.

### Step 6 — Submit the App Update

Webflow app settings → Publish → **Upload Bundle for Review**, then the submission form (App Update; reply in the same email thread).

| Field | Value |
| --- | --- |
| Submission type | App Update |
| App name | Beacon |
| New or changed bundle? | Yes |
| Designer Extension bundle | `apps/beacon/bundle/production/public/v0.1.0_public_09-17_20-41-41.zip` — sha256 `400bae8b903daafbe40158a80c66f79d51cfe2157e3a610aa4de9d32679fd3b5` |
| Source maps (private field only, never the bundle) | `apps/beacon/bundle/production/public/v0.1.0_public_09-17_20-41-41.sourcemaps.zip` — sha256 `093621bec5b757167671fc1e8e5e1340fbe1907199115b1266db0cabf976c6fd` |
| Package manifest + lockfile | `apps/beacon/package.json` + root `pnpm-lock.yaml` as committed at the build commit |
| App Review Preflight receipt | the `wfpre_…` code from Step 4 |
| Testing site | `https://beacon-demo.webflow.io` — bundle above installed; beacon page `https://beacon-demo.webflow.io/blog/the-power-of-resilience` |
| Reviewer credentials | enter in the form only, never in this repo; 2FA on a Workspace admin account |

**Response to the review team** (form limit 500 characters; this is 494). Paste as is:

```
1) No automatic workspace request: a lone workspace is only suggested and saved on the user's click; the server sets no default for extension sessions. 2) No telemetry SDK in this build; a redaction handler covers builds with one. 3) All requests use redirect mode error. 4) Uploads only to the exact create-asset uploadUrl; connect-src allows only that bucket. 5) No unsafe-inline; style attributes blocked. 6) cmsLocaleId on every CMS write; localized sites are not written (listing says so).
```

**Additional notes** (form limit 5000 characters; this is 4959). The form's WAF blocks angle brackets, key-equals-value pairs, DOM API names, `\u00a0` and `/*` — the block below avoids them, paste as is:

```
WHAT CHANGED (bundle v0.1.0, 09-17_20-41-41) - 1 to 6 answer the 2026-09-17 feedback in order; 7 and 8 the Preflight scans

1. Workspace state. The effect that posted the single workspace to /api/v1/beacon/active-workspace on sync completion is removed. A user with one workspace and none active sees it as a suggestion with an explicit "Use this workspace" control; the only request to that endpoint comes from that click or the multi-workspace picker. The server changed too: an extension session without a chosen workspace stays without one (no default from memberships, nothing written) until the user confirms. Unit tests pin zero requests after sync, one after the click, no server fallback.

2. Exception telemetry. The Marketplace build ships no telemetry SDK: the dependency sits behind a build-time release flag that is off for Marketplace bundles; the release build fails if it is on and verifies the zip has no trace of it (no analytics chunk, no telemetry host, no consent prompt). Settings and the privacy policy say so. Builds that enable telemetry run a redaction handler on every event (URLs, referrers, titles, e-mail, tokens, query strings), unit-tested with synthetic sensitive values.

3. Redirects. The single network call site (extension-egress.ts) runs every request with redirect mode set to error; callers cannot override it. No path needs a redirect: Tower answers its API routes directly and the presigned S3 upload returns a 2xx with no redirect field.

4. Upload allowlist. The create-asset adapter registers the exact uploadUrl string Webflow returned as a one-shot permitted destination, only if it names the webflow-prod-assets bucket: host exactly webflow-prod-assets.s3.amazonaws.com (the form production returns) or host s3.amazonaws.com with first path segment webflow-prod-assets (the form the reference documents). The egress policy accepts an upload only for a granted URL and consumes the grant; other buckets, regional S3 hosts, lookalikes and Webflow-owned hosts are refused before any request. connect-src names that bucket, never the bare S3 host: self, https://tower.codalyn.app, https://webflow-prod-assets.s3.amazonaws.com and https://s3.amazonaws.com/webflow-prod-assets. Any other bucket is blocked by the browser.

5. CSP style directives. unsafe-inline is removed: style-src and style-src-elem allow self plus the hosted bundle host; style-src-attr is none. The UI sets styles through the CSSOM, which CSP does not govern. The two style-attribute writes left in the bundle are pinned by count in the release build; both are Designer API calls styling the CMS Slots placeholder on the user's canvas element, outside the extension's policy. All UI stories render clean under the enforced policy.

6. Localization. Every CMS item write names its locale: the extension reads the site's locales (Get Site) once per session and sends the primary locale's cmsLocaleId on every write (image editor field update; CMS Slots layout save, staged and live) and on the matching staged read. Sites with secondary locales are not written: the write is refused before any request with an in-app message. The listing states this.

7. Rich text editing. The rich-text property editor is withdrawn behind a release flag like item 2; its Lexical editor observed its own editable element inside our panel, never the canvas, the shape the bundle scan flagged. Rich-text properties are edited as HTML in a text box; the bundle has no observer construction and no editable-content element.

8. Browser storage and cookies. The session bearer is held in memory only; no storage call in the bundle is keyed by a credential name. Every request sets the cookie mode to omit at the single call site, so no cookie is sent or stored; the only credential on the wire is our Tower session bearer, sent only to tower.codalyn.app.

UNCHANGED FROM 2026-09-15: one network call site with an explicit destination policy (release build fails on a second); canvas changes only through the Designer API on explicit user action; Tower with allowlist-only CORS, session-only auth, server-stored OAuth state, the Webflow ID token never forwarded; no plaintext-HTTP or insecure-websocket URLs, no HTML-injection sinks, no popups or cross-window messaging, no credentials in URLs, no session replay; styles.css ships a v3 source map.

PUBLISHED-RUNTIME TEST: one page-level script, registered with a SHA-256 integrityHash carried verbatim in the page tag with anonymous crossorigin; served unminified, its last line pointing at a version-3 source map published beside it as a site asset (sourcesContent is the file minus that line; no trailing newline). Every other script on the test page is Webflow's own site runtime; Beacon loads none.

BACKEND (Hybrid): https://tower.codalyn.app only, HTTPS, production; paths as filed on 2026-09-15. Other destination: the presigned upload URL in item 4. No telemetry host. Uninstall and AVIF disclosure unchanged.
```

If the review team asks about one item by email, the one-line answers:

- **Workspace** — the effect is gone; `suggestedWorkspaceId` is local state; the only POST is behind the "Use this workspace" click; Tower gives extension sessions no default workspace. Unit-pinned on both sides.
- **Telemetry** — no analytics SDK in the Marketplace build (no posthog trace in the zip, no telemetry host in connect-src); the before_send redaction is unit-tested for builds that enable it.
- **Redirects** — the single fetch site pins redirect mode to error; callers cannot override (unit-pinned).
- **Upload allowlist** — exact uploadUrl granted per create-asset response, single use; connect-src is Tower plus the bucket path only.
- **CSP styles** — no unsafe-inline anywhere; style-src-attr none; React/Radix/vaul use the CSSOM; the two remaining style-attribute writes are Designer API calls on the user's canvas element; 309 stories render clean under the enforced policy.
- **Localization** — cmsLocaleId on every CMS item write (primary, explicit); sites with secondary locales are refused in-app; stated in the listing.
- **Rich text (item 7)** — Lexical editor flag-gated out; zero MutationObserver in the bundle, pinned by the release build.

### Step 7 — Update the Marketplace listing (before you submit)

Add both sentences to the listing description, verbatim:

```
Localization: Beacon does not write CMS content on sites that use Webflow Localization (secondary locales). On such sites, CMS writes from the image editor and CMS Slots are refused in-app with a message; nothing is changed. Sites without secondary locales are fully supported, and every CMS write names the site's primary locale explicitly.
```

```
Beacon sends no usage or error telemetry. AVIF conversion is opt-in and sends only the image being converted to tower.codalyn.app; it is off by default.
```

## Rebuild (only if source changes again)

```bash
CI=true BUILD_RECIPIENT=public pnpm --filter beacon build:prod
```

Release flags unset = the Marketplace state (no telemetry SDK, no rich-text editor, localized-site CMS writes blocked). A new zip means: new hashes here, new Preflight scan, new receipt, re-install on beacon-demo, re-run Step 3 (Sync re-pushes the runtime and its map).
