# SUBMIT — Round 8 runbook (App Update answering the 2026-09-17 review feedback)

> **2026-09-22 — the 2026-09-18 filing (form ref `16838bba-c288-47ee-93e2-a0a19cfd7ece`) never entered review.** Webflow
> reports the extension version behind it was published for **internal testing (Workspace only)**, not to the App
> Marketplace, so the form had no bundle under review behind it (R8.18). The two steps are both required and neither
> substitutes for the other ([Submitting your app](https://developers.webflow.com/data-beta/docs/marketplace/submitting-your-app)
> § *Updating a Designer Extension?*: "Don't forget to publish a new version of your Designer Extension from your
> workspace"): only the *Publish new version* dialog in Workspace settings, on the Marketplace distribution, puts a
> bundle into review; the form at developers.webflow.com/submit records the update and its review artifacts.
> **Step 6a below now spells out the radio.** No review feedback exists for the 09-18 build; it is replaced anyway (R8.18: a vendor
> `MutationObserver` the literal gate never saw). Run every step again for the new build; reply on the existing thread.
>
> **2026-09-22 evening — the 15:25 build is replaced by 19:44 (R8.20).** Testing Step 3 on 15:25 dead-ended every
> signed-in session at the consent link (`no_active_workspace`: the gate had no workspace step after R8.12) and a
> single sign-out disabled the Webflow sign-in for good. Both fixed in the extension; Tower unchanged. 15:25 was never
> installed, published or filed.
>
> **2026-09-25 — 17:27 is replaced by 18:02 (R8.22).** Whole-app audit against the live guideline text. Extension: the
> canvas clear that ran from the Designer mode/page subscriptions is removed (every canvas write now follows a click),
> install and rename toasts prompt to publish, the sign-in card discloses the free plan and paid limits with a pricing
> link, and spark-md5's `ArrayBuffer.prototype.slice` polyfill is removed by patch with a build pin. Tower: membership
> re-checked on every active-workspace resolution, revoke-before-delete on workspace deletion, revoked-token prune on
> the settings pull, PII anonymization on account deletion (privacy policy updated), Flint form rate limit, Sentry
> scrub — **Tower must be deployed (Step 1) before Step 3.** Runtime unchanged.
>
> **2026-09-26 — 18:02 is replaced by 12:24 (R8.23).** Preflight re-issued "Script integrity is missing or wrong"
> on the unchanged 09-18 runtime. The page tag was re-verified correct first (pin script with the saved package's
> values: exit 0). The one shape difference left between our tag and the tags Preflight does not flag was the two
> `data-codalyn-beacon*` attributes after `crossorigin="anonymous"`, written as the page entry's `attributes`. The
> entry is now `{ id, location, version }` only; the runtime identifies itself by registered id and the
> `+beacon.<hash>` in its version; an old entry migrates with one PUT (no new asset, URL/SRI unchanged). **Step 3
> now requires a non-forced sync + publish, and forbids the Sync button.** Runtime file and Tower unchanged.
>
> **2026-09-26, afternoon — no new build (R8.24).** The re-issued items were traced to the tool's own source
> (createsomethingtoday/webflow-app-preflight is the deployed App Review Preflight). "Script integrity" is a
> request-time DOM race in the runner (the tag is read at the file's first request, which Chromium's preload scanner
> issues before the parser inserts it) — reproduced locally 3/3 for our tag and for Webflow's jQuery; nothing on our
> side can clear it. The script rows are a same-host rule (Webflow serves our asset from its own CDN host). The
> bundle-scan excerpt opens ≈2 470 characters before the single `fetch(` match. **Step 5 now expects the three runtime
> items and says what to attach; the notes carry the explanation.** 12:24 stays the build to submit.
>
> **2026-09-25 — 19:44 is replaced by 17:27 (R8.21).** Guideline audit of the R8.20 fixes against the published
> Marketplace guidelines ("every state-changing action must be traceable to a direct user interaction event, not
> fired on load"): the workspace step pre-minted a Tower session-handoff token on mount even on the confirm/pick
> screens that never render the "Open Tower" link. The mint now happens only on the zero-workspace screen. One
> file plus a container test; scanner markers identical to 19:44. 19:44 was never installed, published or filed.

**Build to submit:** `v0.1.0_public_09-26_12-24-24.zip` (built 2026-09-26 12:24). Everything on this page is for this build only.
Why each thing is the way it is: [compliance-record.md](compliance-record.md) Round 8, R8.1–R8.23.
Anything Preflight shows that is not listed under step 4 or step 5 below → stop and follow [playbook.md](playbook.md) § B.

## What the six findings became in code

Every finding is a code change you can point to; none is answered with an explanation alone.

| # | Review finding | What changed | Where |
| --- | --- | --- | --- |
| 1 | Workspace persisted without user interaction | Auto-POST effect deleted; a single workspace is only a local suggestion with a **Use this workspace** button — now the first screen after sign-in (the site gate's workspace step, R8.20). Tower no longer defaults a workspace onto extension sessions (bearer sessions resolve with no membership fallback and no write) | Beacon `settings/model/beacon-app-settings-provider.tsx`, `settings/ui/beacon-workspace-control.tsx`, `auth/ui/beacon-workspace-gate-view.tsx`, `auth/lib/beacon-site-link-gate-state.ts` · Tower `server/resolve-active-organization-id.ts`, `server/billing/session-org.ts`, `server/beacon-settings-context.ts` |
| 2 | Telemetry without redaction | Redaction handler wired as PostHog `before_send`, unit-tested with synthetic secrets. On top: the Marketplace build ships no telemetry SDK at all (release flag off; build gate forbids any trace) | `shared/lib/telemetry-event-redaction.ts`, `shared/lib/init-observability.ts`, `shared/lib/beacon-release-flags.ts` |
| 3 | Redirects followed | `redirect` pinned to `error` at the single fetch site; callers cannot override | `shared/lib/extension-egress.ts` |
| 4 | Any S3 bucket accepted | Exact `uploadUrl` granted once per create-asset response; CSP connect-src names Webflow's bucket only (`https://webflow-prod-assets.s3.amazonaws.com`, the form production returns, plus the path-style form the docs show), never the bare S3 host | `shared/lib/extension-egress.ts`, `shared/lib/webflow-asset-upload-endpoint.ts`, `shared/lib/beacon-extension-csp.ts` |
| 5 | `unsafe-inline` styles | Removed; `style-src-attr 'none'`; every Storybook story rendered under the enforced policy with zero Beacon violations | `shared/lib/beacon-extension-csp.ts`, `apps/beacon/scripts/csp-style-audit.mjs` |
| 6 | No locale on CMS writes | `cmsLocaleId` (primary locale) on every CMS write and the staged read; sites with secondary locales are refused before any request; listing states it | `shared/lib/webflow-cms-write-locale.ts`, image-editor `apply-cropped-export.ts`, cms-slots `cms-slot-list-cms-composition-save.ts` |

## What this build does about each Preflight item

| Preflight item | Cause | This build |
| --- | --- | --- |
| External API Calls (bundle scan) | The one backend call (Tower). Webflow's docs put script registration and CMS writes on the backend; the Designer API has no such surface. The rule (NET-EXTERNAL-EGRESS in the tool's source) matches `fetch(` / `new XMLHttpRequest` only; the zip has exactly one `fetch(`. The excerpt the tool prints opens ≈2 470 characters *before* the match — a column-offset display bug (R8.24) — so the storage cleanup, the policy links and the Tower origin it has "sat on" were never the evidence | Persists by design (the rule's bucket is "needs explanation"). Explained in the notes' BACKEND paragraph; the single `fetch(` and the Tower origin stay. Not raised by the human review team in round 8 |
| Silent Canvas Mutations (bundle scan) | Never reported by a scan — but `@dnd-kit/core`'s drag re-measuring observer sat in every bundle through 09-18, constructed through an alias read off `window`, so neither Preflight's rule nor the release gate's literal `new MutationObserver(` pin saw it; a reviewer's `grep -i MutationObserver` does (R8.18) | **Removed** by pnpm patch; the release gate now pins the bare identifier to 0 on dist and zip. Expected absent |
| Generated code is not traceable to readable source (bundle scan, evidence `` `;function:1 ``) | The runtime trailer builder minified to `` `//# sourceMappingURL=`;function `` in bundle.js; the scanner read `` `;function `` as a map file name and found no such map. Every real JS/CSS file already had its v3 map in the private zip | **Fixed.** The pragma is joined from two halves at sync time; no shipped file carries the token (release build pins the count to 0 on dist and zip). Published runtime bytes unchanged |
| Runtime is not traceable to source | No source map behind the runtime | **Fixed.** Sync uploads a v3 identity source map beside the runtime; the runtime's last line points at it |
| Script integrity is missing or wrong | Tool-side (R8.24, reproduced): the runner reads the tag from a DOM snapshot taken at the file's *first request*; Chromium's preload scanner issues that request while the parser is still blocked on jQuery/webflow.js, so no script element exists yet and `domIntegrity` is null — the served tag (verified correct every round) is never read. Same for Webflow's own jQuery tag | **No change on our side can clear it.** R8.23's attribute-free entry stays (cleaner tag). Evidence: `scripts/webflow-runtime-sri-replica.mjs` (exit 1, 3/3), the notes' PUBLISHED-RUNTIME TEST paragraph, [history/preflight-runtime-sri-request-boundary.md](history/preflight-runtime-sri-request-boundary.md) (issue for the tool; Miles files). Expect the item; attach the evidence; do not rebuild for it |
| New script elements / Unreviewed scripts | The tool lists every script on the pinned file's *host* that is not pinned — and Webflow serves our asset from its own CDN host (`cdn.prod.website-files.com`), the same host as webflow.js, its achunk imports and GSAP (R8.24). Script *requests* on that host are labelled "runtime created" whatever their initiator | Structural. A bare page (Step 3) drops GSAP/ScrollTrigger and most achunks; webflow.js + its chunks remain on every Webflow page. Pinning them needs per-publish hashes and moves webflow.js/GSAP into the SRI item. Answered in the notes |

## Do these in order

### Step 1 — Deploy Tower (finding 1 is partly server-side)

> Done on 2026-09-18 (R8.17, probe-verified); nothing server-side changed in R8.18 — skip unless Tower changed since.

From the repo root, signed in to the Vercel account that owns `codalyn-tower`:

```bash
vercel deploy --prod --yes
pnpm --filter tower db:migrate:prod -- --confirm   # applies migration 0037 (R8.11); needs NEON_PROJECT_ID + TOWER_NEON_BRANCH_PROD (or TOWER_DATABASE_URL_PROD)
```

R8.22 (2026-09-25) adds Tower-side changes with **no migration**: membership re-check in the active-workspace resolver
and session clearing on admin removal, Webflow revoke before workspace delete/purge, revoked-token prune in the settings
pull, personal-data anonymization on account deletion, the privacy-policy text (§1 Beacon bullet, §6), Flint beta-form
rate limits, Sentry `beforeSend` scrubbing. They ship with the same `vercel deploy --prod` above. Verify after deploy:
`https://tower.codalyn.app/privacy` shows the "Uninstalling Beacon or disconnecting Webflow" bullet.

Check: `https://tower.codalyn.app/privacy` § 1 says the Marketplace build includes no analytics SDK.

### Step 2 — Commit

R8.18 and R8.20 are committed (`c86fce6`, `26b5200`). The R8.21 and R8.22 change sets are uncommitted: R8.21 =
`auth/ui/beacon-site-link-gate.tsx` + its test; R8.22 = `cms-slots/ui/cms-slots-screen.tsx`, the deleted
`cms-slot-list-target-designer-preview.ts`, `cms-slot-list-target-instance-surface.ts`, `cms-slots-feature-copy.ts`,
`auth/ui/beacon-onboarding.tsx`, `shared/lib/codalyn-links.ts` (+test), `patches/spark-md5@3.0.2.patch` +
`package.json`/`pnpm-lock.yaml`, `scripts/build-cli.mjs`, `scripts/vite-strip-dev-host-literals.mjs`,
`apps/beacon/scripts/release-build-gates.test.mjs`, the Tower files listed in Step 1 with their tests, and these docs.
R8.23 (2026-09-26, uncommitted) = `cms-slots/model/cms-slot-page-inline-script.ts` + its two test files,
`docs/beacon-rich-text-editor.md`, and these docs (compliance record R8.23, this file, the history note).
Commit before uploading anything, so the artifact hash maps to a commit.

### Step 3 — Install the bundle on the test site and push the runtime

1. Workspace settings → Apps & Integrations → Beacon → **Publish new version** → upload
   `apps/beacon/bundle/production/public/v0.1.0_public_09-26_12-24-24.zip` → distribution **"Publish for internal
   testing (Workspace only)"** → publish. This installs the build on beacon-demo for Steps 3–5 and is **not** the
   submission: an internal version never enters review (what happened on 09-18, R8.18). Step 6a publishes the same
   zip again with the Marketplace radio. Uploading the *submission* zip here is deliberate — Steps 3–5 must exercise
   the exact artifact that goes to review — and is the one case where a file from `bundle/production/public/` is
   used for an internal-testing publish. It is not licence to build a test artifact into that folder
   ([playbook.md](playbook.md) § A3).
2. Open Beacon on **beacon-demo**. The panel must render. The extension console may show exactly two CSP lines,
   both from Webflow's own injected `entrypoint-designer-extensions-client.….js` and expected (R7b.15, R8.20):
   `Applying inline style violates … 'style-src-elem'` (its rrweb `<style>`) and `Connecting to
   https://d3e54v103j8qbb.cloudfront.net/…js… violates … "connect-src"` (DevTools fetching its `.js.map`). The
   PayPal 400 and the `start_url` manifest warning are the Designer's top frame. **Any CSP line naming a Beacon
   file, or any Tower request error, → stop** and record it.
3. Sign in. If the welcome screen shows, click **Continue with Webflow** (no password; a profile that never
   signed out is signed in silently). The next screen must be **Confirm your workspace → Use this workspace**
   (one workspace) or a pick list. Before clicking, DevTools → Network filtered to `tower.codalyn.app`: after the
   settings pull nothing else fires on that screen (R8.21); the click issues exactly one
   `POST /api/v1/beacon/active-workspace`. Click. If the app opens with a workspace already active and no click, Tower
   is not deployed yet → Step 1. If the consent gate shows instead ("Authorize Beacon Demo in Webflow…"), the
   site is outside the workspace's grant: click **Open Webflow authorization**, approve beacon-demo, return —
   Beacon unlocks on its own. A "No workspace is active" error on that gate is a defect → record it.
4. **Test page.** Prefer a bare page: a new blank page with one working beacon list, no Interactions, no
   template components, no embeds. Webflow's site runtime still loads (it is on every page), but GSAP,
   ScrollTrigger and most `achunk` files disappear from Preflight's "unreviewed" list. If you keep
   `/blog/the-power-of-resilience`, expect those files to be listed again.
5. **This build changes the page entry, not the runtime file** (R8.23): the runtime pushed on 09-18
   (`…9b7da263.js`) stays the one on the page and the Step 5 values still hold. Migrate the entry once so
   Webflow renders the tag without the two `data-codalyn-beacon*` attributes — a cleaner tag; R8.24 shows it cannot
   by itself clear the Preflight item, so do this once and do not loop on it. **Trigger a non-forced sync: open
   the page's beacon in the Composer, change one value, Save; then change it back, Save** (a save with no change
   returns before syncing; the second save is the no-op that proves it settled). A list rename + rename back does
   the same. **Do not press the page runtime Sync button**: it is the forced repair path, mints a new asset id
   and registration, and changes the URL and SRI (R8.16) — the saved Preflight package would then be stale. The
   migration is one `PUT pages/{id}/custom_code` and no upload; the extension console must show no asset request.
   Only if the page carries no Beacon runtime at all, or the pin script in step 7 reports a mismatch, use the Sync
   button. It must succeed. That forced Sync uploads **two** assets — the
   source map (`codalyn-beacon-runtime-<hash>.map.json`), then the runtime JS — both through the presigned
   upload under the new `connect-src`. Watch the extension console:
   - a `connect-src` violation or an "Extension egress refused" error → Webflow's `uploadUrl` is neither
     `https://webflow-prod-assets.s3.amazonaws.com/` (what production returned on 2026-09-17) nor the
     documented path-style form; copy the exact URL from the error into the compliance record before
     touching anything;
   - a "runtime source map upload failed" warning → Webflow refused the `.map.json` asset; the runtime still
     installed, without a map pointer. Copy the warning's error into the compliance record.
6. **Publish** the site — required this round (the migrated entry reaches the published page only on publish).
7. Confirm the page from the terminal (replace the URL if you used a bare page). After the migration the Beacon
   `<script>` tag in the served HTML must end at `crossorigin="anonymous">` — check with
   `curl -s <page> | grep -o '<script[^>]*codalyn-beacon-runtime[^>]*>'`:

```bash
node scripts/webflow-runtime-observe.mjs https://beacon-demo.webflow.io/blog/the-power-of-resilience   # must exit 0: Beacon requested 0 scripts, integrity matches
node scripts/webflow-runtime-pin.mjs     https://beacon-demo.webflow.io/blog/the-power-of-resilience   # must exit 0: "✓ matches", "trailing newline: no", source map "✓ v3"
```

After the non-forced migration the pin script must still print the 09-18 values already in Step 5 (file
`…9b7da263.js`, SHA-256 `49b338fa…05fd`, SRI `sha256-SbM4+…Bf0=`) — nothing about the file changed. Only after a
forced Sync does it print **new** values — then replace the Step 5 rows with them and re-save the Preflight package.

### Step 4 — App Review Preflight: bundle scan

Open **App Review Preflight** in the Designer ([install it into the Workspace](https://webflow.com/oauth/authorize?response_type=code&client_id=0b5411e62233387925e082350666ef374377f81a9abba0dcc2542d6b5b1e4388&scope=authorized_user%3Aread) if it is missing).

1. Upload both files from `apps/beacon/bundle/production/public/`:
   - bundle → `v0.1.0_public_09-26_12-24-24.zip`
   - source maps → `v0.1.0_public_09-26_12-24-24.sourcemaps.zip`
2. Expected **Review feedback: exactly one item, "External API Calls" (REQUIRED), 1 evidence location** in `assets/label-*.js`.
   That is the extension's single backend call (Hybrid App: Tower). It cannot go away while the app has a backend; the notes in Step 6 disclose it. The rule matches `fetch(` / `new XMLHttpRequest` only (one match in the zip); the excerpt the tool prints opens ≈2 470 characters *before* that match (a column-offset display bug, R8.24), so whatever code it shows is not the evidence — do not change code because of the excerpt.
3. Anything else — a second item, "Silent Canvas Mutations", an External API Calls excerpt outside the `label-*.js` chunk — → stop, [playbook.md](playbook.md) § B.
4. Copy the receipt code (`wfpre_…`) into Step 6. (It was issued with this item present on 09-14.)

### Step 5 — App Review Preflight: "Test the published runtime"

Fill exactly these values, save the test setup (it binds to the uploaded bundle), run the test.

**Before running, check the package against the page.** A saved package that still holds a superseded runtime
(different asset id, different SRI) reports "Script integrity is missing or wrong" against the page's current,
correct tag — rule that out before reading the result as an app defect (R8.16):

```bash
node scripts/webflow-runtime-pin.mjs https://beacon-demo.webflow.io/blog/the-power-of-resilience \
  --expect-url=https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/6aac8a88596e00b6a2967e15_codalyn-beacon-runtime-9b7da263.js \
  --expect-sha256=49b338fa78e1f8136b1ab1a983b3f72e618536c92718158d6aa722ab692405fd \
  --expect-sri=sha256-SbM4+njh+BNrGrGpg7P3LmGFNsknGBWNaqciq2kkBf0=
```

Pass whatever the Preflight form currently holds. Exit 0 = the package describes this page; exit 1 names the
superseded value to replace, or says the page carries no Beacon runtime at all. Verified exit 0 for the values
in the table on 2026-09-18 14:55 UTC and again after filing.

| Field | Paste |
| --- | --- |
| Published Webflow test URL | `https://beacon-demo.webflow.io/blog/the-power-of-resilience` — or the bare page from Step 3 |
| Webflow installation or site ID | prefilled by Preflight — `6a35c562c551e2eb11bc4f1c` |
| Runtime file 1 — Versioned runtime URL | `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/6aac8a88596e00b6a2967e15_codalyn-beacon-runtime-9b7da263.js` — the runtime pushed on 2026-09-18 00:49 UTC and re-verified 14:55 UTC. Re-run the pin script and replace this row **after any further Sync**: a forced Sync mints a new asset id, so the URL changes even when the bytes do not. The 09-14 file `…1ebc5741.js` is superseded |
| How runtime file 1 loads | **Loaded directly by the published page** |
| SHA-256 | `49b338fa78e1f8136b1ab1a983b3f72e618536c92718158d6aa722ab692405fd` |
| Script integrity (SRI) | derived by the form — must come out as `sha256-SbM4+njh+BNrGrGpg7P3LmGFNsknGBWNaqciq2kkBf0=`, the value the page tag carries. If the saved package shows anything else (an older runtime's SRI), that alone produces "Script integrity is missing or wrong" |
| More runtime files | leave empty — Webflow's own scripts are not pinned (decision R7b.16) |
| Does your app proxy or fetch another URL for customers? | **No** |
| Ready selector | `[data-beacon-target="list"][data-cb-rendered="1"]` |

Expected result for this build, and what to do with each item:

| Result | Expected now | If it shows |
| --- | --- | --- |
| Runtime is not traceable to source | **Gone** — the runtime's last line points at the uploaded v3 source map | The pin script's `source map` line tells you why (no trailer = map upload refused; unreachable = CDN). Copy it into the compliance record. |
| Script integrity is missing or wrong | **Expected to persist** — the runner's request-time DOM snapshot never contains a preload-scanned tag (R8.24); the page tag, CORS, bytes and package are correct and verified | Do **not** change the runtime, the tag or the package, and do **not** add Webflow's jQuery as a control row: a saved runtime file cannot be removed from the form (R7b.16) and its hash changes on every publish, which would turn the submission package into a "Runtime bytes changed" blocker. Run `node scripts/webflow-runtime-sri-replica.mjs <page>` once (exit 1, 3/3 = same cause, jQuery included) and keep the output; attach it to the submission thread if asked. |
| New script elements · Unreviewed scripts | Only Webflow's site runtime (`webflow.<site>.<hash>.js` + the achunks it imports) on a bare page; the full list with GSAP/ScrollTrigger on the blog page | Expected — every script on our asset's CDN host that is not pinned (R8.24). Pinning them only moves them into the SRI item. Answered in the notes. |

Runtime file row will read **Loaded ✓ · Hash matched ✓ · SRI ✗ · Source map ✓** — the SRI ✗ is the tool's request-time snapshot (R8.24), not the page; "Runtime security blocked" is the expected headline.
If a reviewer explicitly asks for Webflow's platform scripts to be pinned: [history/webflow-platform-script-rows-2026-09-14.md](history/webflow-platform-script-rows-2026-09-14.md) — re-run the observe script first, the values change on every publish.

### Step 6 — Publish the version for review, then file the form

**6a — the publish that enters review (the step missed on 09-18, R8.18).** Published requirement: an App Update that
changes the Designer Extension must publish a new version from the Workspace *in addition to* the form
([Publishing your app](https://developers.webflow.com/data-beta/docs/publishing-your-app),
[Submitting your app](https://developers.webflow.com/data-beta/docs/marketplace/submitting-your-app) §
*Updating a Designer Extension?*). The docs fix no order; do the publish first anyway, so the form's artifacts
describe a version that is already in review. In the current dialog the distribution is a radio: Workspace settings → Apps & Integrations → Beacon → **Publish new version** →
*Upload zip file* → the same `v0.1.0_public_09-26_12-24-24.zip` as Step 3 → **Select distribution: "Publish new
version to the App Marketplace (submit for review)"** — not "Publish for internal testing (Workspace only)" →
*Submission version notes* (the four headings the dialog pre-fills; paste the block below) → **Submit for review**.
Afterwards the version manager must show this version as submitted for review, not as another internal version; if it
does not, the radio was wrong — repeat with the Marketplace radio.

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

**6b — the form.** <https://developers.webflow.com/submit> → App Update → *App functionality, permissions, or bundle*
(reply in the same email thread).

Published requirement for an App Update: **App Name and Client ID are required**, plus the artifacts the form
validates (published testing site; source maps, because this update ships a new generated bundle). *"All other fields
are optional… complete only the fields you wish to modify"* — so leave listing copy, install URL, scopes, pricing and
support fields untouched this round; nothing about them changed.

| Field | Value |
| --- | --- |
| Submission type | App Update |
| App name | Beacon |
| Client ID (required) | `610625f8…` — the production app. Copy the full value from Workspace settings → Apps & Integrations → Beacon → **…** → *Edit App*. The `.env.local` id `c6cff6ae…` is the **dev** app; never paste that |
| New or changed bundle? | Yes |
| Designer Extension bundle | `apps/beacon/bundle/production/public/v0.1.0_public_09-26_12-24-24.zip` — sha256 `29f1087c54a4aed157f23a2f2b239bae779d839944435234f8c303cabb414142`. Same zip as Step 6a; the form copy is only so review can reconcile the artifact — the bundle that *enters* review is the version published in 6a |
| Source maps (private field only, never the bundle) | `apps/beacon/bundle/production/public/v0.1.0_public_09-26_12-24-24.sourcemaps.zip` — sha256 `e0524504a2c6c6fa4c756eba9225354ca48089444febef68de803a5e63611d2f` |
| Package manifest + lockfile | `apps/beacon/package.json` + root `pnpm-lock.yaml` as committed at the build commit |
| App Review Preflight receipt | the `wfpre_…` code from Step 4 |
| Testing site | `https://beacon-demo.webflow.io` — bundle above installed; beacon page `https://beacon-demo.webflow.io/blog/the-power-of-resilience` |
| Reviewer credentials | enter in the form only, never in this repo; 2FA on a Workspace admin account |

> **There is no "response to the review team" field on the form.** Rounds 6–7b pasted a 500-character body into one;
> it is not in the current form and not in the published submission flow (the 500-character field is the version-notes
> dialog in 6a). The condensed six-item body is kept for the email thread in
> [history/responses.md](history/responses.md); per-item email answers are below. Nothing is lost: items 1–6 of
> **Additional notes** say the same thing in full.

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

If the review team asks about one item by email, the one-line answers:

- **Workspace** — the effect is gone; `suggestedWorkspaceId` is local state; the only POST is behind the "Use this workspace" click; Tower gives extension sessions no default workspace. Unit-pinned on both sides.
- **Telemetry** — no analytics SDK in the Marketplace build (no posthog trace in the zip, no telemetry host in connect-src); the before_send redaction is unit-tested for builds that enable it.
- **Redirects** — the single fetch site pins redirect mode to error; callers cannot override (unit-pinned).
- **Upload allowlist** — exact uploadUrl granted per create-asset response, single use; connect-src is Tower plus the bucket path only.
- **CSP styles** — no unsafe-inline anywhere; style-src-attr none; React/Radix/vaul use the CSSOM; the two remaining style-attribute writes are Designer API calls on the user's canvas element; 309 stories render clean under the enforced policy.
- **Localization** — cmsLocaleId on every CMS item write (primary, explicit); sites with secondary locales are refused in-app; stated in the listing.
- **DOM observers (item 7)** — Lexical editor flag-gated out; the drag-and-drop library's re-measuring observer patched out (R8.18); zero `MutationObserver` references in the bundle, pinned by the release build on dist and zip.

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
CI=true BUILD_PURPOSE=marketplace pnpm --filter beacon build:prod
```

`BUILD_PURPOSE=marketplace` is what puts the artifact in `bundle/production/public/`; that folder is
for submission builds only. Anything you build to test a fix is `pnpm --filter beacon build:prod`
(recipient `internal`) and never goes in it — see [playbook.md](playbook.md) § A3.

Release flags unset = the Marketplace state (no telemetry SDK, no rich-text editor, localized-site CMS writes blocked). A new zip means: new hashes here, new Preflight scan, new receipt, re-install on beacon-demo, re-run Step 3 (Sync re-pushes the runtime and its map).
