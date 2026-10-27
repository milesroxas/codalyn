# SUBMIT — Round 9 runbook (App Update answering the 2026-09-28 review feedback, ticket #1197949)

> **2026-09-28 — feedback on the 09-26 filing (ref `1d3acdf7-fdb1-4e03-8a62-e5016224b64a`).** One finding with
> four sub-findings, all fixed in code (compliance-record.md Round 9, R9.1–R9.5). The main one is server-side:
> **Tower must be deployed and migration 0038 applied before anything is installed or tested (Step 1 — migration
> applied and code pushed 09-28; confirm the CI deploy before Step 4).** The
> published-site runtime changed (R9.3), so the test site needed a **forced Sync + publish** this round (Step 4.7,
> done 2026-10-25: runtime `…a845ca3b.js`, pin/observe exit 0) and needs new Preflight runtime values (Step 5).
> **Status 2026-10-26:** Step 2 redone (13:50 build, hashes below — the 10-21 artifact is superseded). Next: Step 3
> (upload the 10-26 bundle for internal testing), Step 0 checks, then Steps 4, 5, 6, 7, 8 in that order. The
> published runtime did not change, so Step 4.7 and the Step 5 runtime values stay valid.
>
> The steps below follow the official process — [Submitting your App](https://developers.webflow.com/apps/docs/marketplace/submitting-your-app),
> [Publishing a Designer Extension](https://developers.webflow.com/apps/docs/publishing-your-app),
> [Marketplace Guidelines](https://developers.webflow.com/apps/docs/marketplace-guidelines),
> [Listing your App](https://developers.webflow.com/apps/docs/marketplace/listing-your-app) — and the two vendored
> skills (`webflow-app-preflight`, `webflow-app-review-remediation`). Where a step is a skill control rather than
> published policy it says `[control]`.
>
> The reviewer's reproduction uses **a Tower account and a Webflow account with different e-mails**. Step 4
> reproduces exactly that; do not test with matching e-mails only.

Why each thing is the way it is: [compliance-record.md](compliance-record.md) Round 9 (and Round 8 for
everything that carried over). Anything Preflight shows that is not listed under Step 5 → stop and follow
[playbook.md](playbook.md) § B. Build lanes: [.claude/skills/codalyn-release-lanes](../../.claude/skills/codalyn-release-lanes/SKILL.md).

## What the five findings became in code

| # | Review finding | What changed | Where |
| --- | --- | --- | --- |
| 1 | Repeated sign-in and OAuth after installation (Tower and Webflow e-mails differ) | The Webflow user who approves an OAuth is recorded on the token (`token/authorized_by`) with the Tower account that completed it, and linked to that account. The Designer ID-token exchange resolves the account by **Webflow user id** — the Designer link, else the install-time authorization (resolved lazily for tokens stored before this round) — never by e-mail. The silent run on load only *restores* (`intent: "restore"`, `no_tower_account` → welcome screen); account linking by verified e-mail and account creation happen only on the "Continue with Webflow" click (`intent: "sign_in"`). Id-associated accounts get no e-mail flip and no credential revocation | Tower `server/webflow-designer-identity.ts`, `server/webflow-designer-session-logic.ts`, `server/webflow-oauth-persist.ts`, `api/integrations/webflow/callback/route.ts`, `api/integrations/webflow/authorize/route.ts`, `api/auth/webflow-designer/route.ts`, `drizzle/0038_webflow_token_authorizer.sql` · Beacon `auth/lib/webflow-designer-session.ts`, `auth/model/use-beacon-tower-session.ts`, `auth/lib/beacon-tower-designer-exchange-policy.ts`, `auth/lib/webflow-sign-in-error.ts` |
| 2 | Authorize URL prepared when the gate mounts | Nothing is minted on mount. "Connect site in Webflow" mints the authorize URL on the click, then "Open Webflow authorization" is a plain new-tab anchor; stale → back to the button. Same two-step for the zero-workspace "Open Tower" handoff. Gate copy names it a new authorization for this site, distinct from the restored session | Beacon `auth/model/use-prepared-external-link.ts`, `auth/model/use-webflow-authorize-link.ts`, `auth/model/use-tower-handoff-link.ts`, `auth/ui/prepared-external-link-action.tsx`, `auth/ui/webflow-authorize-gate-view.tsx`, `auth/ui/beacon-workspace-gate-view.tsx`, `auth/ui/beacon-site-link-gate.tsx` |
| 3 | `srcset` candidate list passed the HTTPS check | The image gate accepts exactly one URL: whitespace or a trailing comma (the candidate separators) refuses the value everywhere — img, sources, CSS background — with no partial application | Beacon `cms-slots/model/cms-slot-beacon-prop-runtime.ts` (`bSafeSrc`) — **published-site runtime changes** |
| 4 | OAuth URL allowlist accepted non-default ports and credentials | `url.origin === "https://webflow.com"`, exact `/oauth/authorize`, empty `username`/`password` | Beacon `auth/lib/tower-app-link.ts` |
| 5 | Hosted script URL checked only for a non-empty string | Shared validator: HTTPS, Webflow asset host, no credentials, no non-default port, no whitespace — applied to the create-asset response before upload and again before `registered_scripts/hosted`; SHA-256 `integrityHash` unchanged | Beacon `shared/lib/webflow-hosted-asset-url.ts`, `cms-slots/model/cms-slot-page-inline-script.ts` |

Everything from round 8 (workspace confirmation on click, no telemetry SDK, redirect mode error, exact
upload URL, no `unsafe-inline`, `cmsLocaleId`, no `MutationObserver`, identity source map, attribute-free
page entry) is unchanged and still pinned by the release build.

## Do these in order

The official sequence is: prerequisites → production build → upload the version to the Workspace and test it
there (**Launch App**) → App Review Preflight on the exact bundle and review ZIP → demo video → publish the
version for review → the submission form → wait for the decision. Each step names where it comes from. The
six states are reported separately and a later one is never inferred from an earlier one (remediation skill
§ 5): source verified · artifact verified · installed revision verified · runtime observed · submitted ·
reviewer accepted.

### Step 0 — Prerequisites (official "Prerequisites" and "Submission prep")

Check every line before uploading anything. A failed line is a stop.

1. **Two-factor authentication is enabled on an admin account of the submitting Workspace**, and the person
   publishing is a Workspace admin. Without both, **Publish extension version** is disabled.
2. **Tower is live on production and stays live for the whole review** (10 business days plus follow-up). A
   push to `main` **is** the Tower deploy (CI `deploy-tower` after `verify`); migrations are never automatic —
   apply, confirm, then push (root `CLAUDE.md`). Verify now and again on the day you submit:

```bash
curl -s https://tower.codalyn.app/api/health                 # {"ok":true,"service":"tower"}
pnpm --filter tower db:migrate:status:prod                   # read-only; nothing pending (39/39 after 0038)
gh run list --branch main --workflow ci.yml --limit 1        # last push to main: deploy-tower success
```

   Do not push anything to `main` that changes Tower behaviour between filing and the decision.
3. **The review account works and keeps working.** Sign in to Tower as the reviewer's account
   (`marketplaceteam@…`) in a private window: password sign-in succeeds, the workspace "Webflow Marketplace
   Team" is present, beacon-demo is listed as connected. Official: "Keep the review account active through
   review and after approval, on your highest tier, without expiry." No third-party service access is needed.
4. **The App's registered Install URL is Tower's own endpoint**,
   `https://tower.codalyn.app/api/integrations/webflow/authorize` (Workspace settings → Apps & Integrations →
   Beacon → *Edit App*). It mints a single-use OAuth `state` per request bound to the browser session
   `[control]`; a fixed `webflow.com/oauth/authorize` URL would not satisfy the form's Hybrid Install URL field.
   Do not change it this round.
5. **Scopes configured on the App equal the scopes the Install URL requests** (official: "Requested scopes must
   match the app configuration"). Compare *Edit App → Building blocks → Data client* with the `scope=` the
   authorize route sends. Nothing changed in round 9; they must still match.
6. **Listing URLs resolve**: website, privacy policy and terms of service (distinct pages `[control]`), support
   e-mail. All listing text is English.
7. **Backend dependency scan** (official, Data Client: "Scan backend components for CVEs and unmaintained
   dependencies before submission"): `pnpm --filter tower audit --prod --audit-level=high` reports no High or
   Critical advisory, or the compliance record names a function-level reachability analysis for each one
   `[control]`.
8. **Source is committed** so the artifact hash maps to a commit: round 9 is `7db30cd9`, the review-ZIP build
   change is `3d4b2cb`. Any further source change gets its own commit before Step 2.

### Step 1 — The fixes (done)

All five findings are fixed in source (`7db30cd9`, 2026-09-28; table above; compliance-record Round 9). Tower
migration 0038 was applied before the deploy; CI run 36484535449 deployed `codalyn-tower-mp1v74bjs`. Nothing
here is reopened unless Step 4 fails.

### Step 2 — Build the production artifact and verify the artifact, not the working directory

```bash
CI=true BUILD_PURPOSE=marketplace pnpm --filter beacon build:prod
```

Only this command writes to `apps/beacon/bundle/production/public/`. It produces the two files the process
needs: the production bundle (uploaded through the Workspace, Steps 3 and 7) and the review ZIP (uploaded only
through the form's **Source map artifact** field, Step 8). Record both names and `shasum -a 256` here and in
the compliance record.

- Bundle: `v0.1.0_public_10-26_13-50-30.zip` — sha256
  `a27f05116aa2ee3dac8daf3a08d301f27f2737ce4c57e735804bd8ab78f773c2` (built 2026-10-26 13:50 EDT; application
  source = `7db30cd9` + the 2026-10-26 review-ZIP hygiene change below; 456 493 bytes).
- Review ZIP: `v0.1.0_public_10-26_13-50-30.sourcemaps.zip` — sha256
  `1c7ccaedfdd5e694674f6d8196b2a4fa742bcea24964a5d0e5c255971c02f152` (7 `.map` files + `apps/beacon/package.json`
  + root `pnpm-lock.yaml`, all from this build; `build-cli` fails if either manifest is missing).
- Superseded, do not upload: `v0.1.0_public_10-21_16-02-02.zip` (sha256 `731b9dd0…`) and its review ZIP — the
  10-21 maps carried the development debug HUD source, a test-mode egress branch and two `import.meta.env.DEV`
  branches; the bundle carried an unreferenced `beacon-thumb.jpg` (compliance-record 2026-10-26).

**What the 2026-10-26 build changed (review-ZIP hygiene, no behaviour change):** the published-site debug HUD
moved to `cms-slot-beacon-debug-hud.ts`, imported only on the development channel, so release maps no longer
carry it; `extension-egress.ts` lost its `MODE === "test"` relative-path branch (Vitest now bakes
`https://tower.test` as the origin); `beacon-tower-origin.ts` reads only the baked `__BEACON_TOWER_ORIGIN__`
(no runtime env fallback); `tower-reachability-error.ts` lost its developer-only copy; the image editor's
`import.meta.env.DEV` "Resolved constraints" readout is gone; `beacon-thumb.jpg` moved to `.storybook/public/`;
`scripts/build-cli.mjs` gained a pinned bundle-inventory gate (`bundleEntryAllowlist`, tested in
`release-build-gates.test.mjs`) so a stray `public/` file fails the build. The generated published-site runtime is
byte-identical to the one synced 2026-10-25 (`…a845ca3b.js`), so Step 4.7 and the Step 5 runtime values stand.

Then check the **unzipped bundle** (quality gate "Is it safe and inspectable?"; official: "Before uploading the
production bundle, remove source maps, debug routes, bypass flags, staging identities, and CLI state"):

| Check | Command on the unzipped bundle | Observed 2026-10-26 (13:50 build) |
| --- | --- | --- |
| No source maps in the public bundle (Required update otherwise) | `find . -name '*.map'`; `grep -l 'sourceMappingURL=data:' bundle.js assets/*.js` | 0 · 0 |
| Exactly one `webflow.json`, real name, `apiVersion` `"2"`, `publicDir` = build output, no `telemetry` block | `find . -name webflow.json`; `cat webflow.json` | 1 · `{"name":"beacon","publicDir":"dist","size":"comfortable","apiVersion":"2"}` |
| ≤ 5 MB | `ls -l` the zip | 456 493 bytes |
| Production build, no dev residue | [playbook](playbook.md) § A4 greps | `window.open(` 0 · `MutationObserver` 0 · `postMessage(` 0 · `ws://` 0 · posthog/sentry/localhost 0 · bare `fetch(` 1 · `http://` W3C namespaces only · `restore`/`sign_in`/`no_tower_account` present |
| Review ZIP contents | `unzip -Z1 …sourcemaps.zip` | 7 maps + `package.json` + `pnpm-lock.yaml` |
| Pinned bundle inventory (new gate) | `unzip -Z1` vs `bundleEntryAllowlist` in `scripts/build-cli.mjs` | 20 entries, all allowed; no `beacon-thumb.jpg` |
| Review-ZIP maps carry no dev/test-only first-party source | map `sources` + `sourcesContent` scan | no debug HUD, no `MODE === "test"`, no `import.meta.env.DEV`, no test/story/mock paths |

### Step 3 — Upload the version to the Workspace and open it with "Launch App" (official "Publishing a Designer Extension")

1. Workspace settings → **Apps & Integrations** → under **Develop**, Beacon → **Publish extension version**.
   This Workspace's dialog offers *Publish for internal testing (Workspace only)* and *Publish new version to
   the App Marketplace*; choose **internal testing** here — the Marketplace publish is Step 7, after Preflight
   and the video. Select the Step 2 bundle, add version notes, publish. The version appears under
   **… → Version History**.
2. On beacon-demo open Beacon with **Launch App** — never **Launch development app**, which loads the local
   dev URL instead of the uploaded version. Confirm the panel renders and the extension console shows only
   the two Webflow-client CSP lines (R7b.15, R8.25). Any CSP line naming a Beacon file → stop (an
   installed-only CSP regression; playbook § A5).
3. Done 2026-10-25 for the 10-21 bundle; **redo for the 10-26 bundle** (new internal-testing upload, Launch App, console check).

### Step 4 — Retest the whole App on the testing site (official "Submission prep": test every core workflow end to end; verify installation, OAuth approval and denial, disconnect, reconnect and uninstall cleanup)

Reviewers retest everything and "Fix all earlier feedback, not just the latest round", so this is a full
pass, not only the round-9 reproduction. Use **two accounts with different e-mails**: Tower account **A**
(workspace admin of the workspace holding the grant) and Webflow user **W** (admin of the Webflow workspace
owning beacon-demo). Record each result in the compliance record.

1. **Installation / OAuth approval (round-9 reproduction).** In a browser signed in to Tower as A: Tower →
   Connection → **Relink Webflow** (the same cookie flow as the Install URL) → approve on webflow.com **as W**
   → back on Tower, *Connected*, beacon-demo listed. Then open Beacon in the Designer as W (fresh tab,
   extension not signed out on this profile). Expected with no click: **Confirm your workspace → Use this
   workspace** (A's workspace), **no welcome screen, no OAuth screen**. DevTools → Network filtered to
   `tower.codalyn.app`: one `POST /api/auth/webflow-designer` with `"intent":"restore"` (200), the session
   read, the settings pull, nothing to `/api/integrations/webflow/authorize`. Click **Use this workspace** →
   the app unlocks. Welcome screen instead → stop: Step 0.2 failed or W's approval went to another workspace.
2. **Routine sign-in never re-triggers OAuth** (guideline "Sessions"). Header menu → **Sign out** → welcome
   screen → **Continue with Webflow** (`"intent":"sign_in"`) → same account A, same workspace confirmation,
   app unlocks, no OAuth.
3. **New authorization is explicit.** As W, signed in, open Beacon on a site **outside** the grant: "Authorize
   this site in Webflow" with the **Connect site in Webflow** button; Network shows **no** request to
   `/api/integrations/webflow/authorize` until the click. Click → "Preparing…" → **Open Webflow
   authorization** anchor (`target=_blank`); exactly one `POST …/authorize`. Approve → Beacon unlocks on its
   own. Optional: after 8+ minutes hover the ready anchor → it turns back into the button with no request.
4. **OAuth denial** (official: "Verify installation, OAuth approval, and handling of denied requests"). Repeat
   step 3 and press the deny / cancel control on the webflow.com consent screen. Expected: the browser lands
   on Tower's callback with a plain error message (the callback forwards Webflow's `error_description`),
   nothing is stored (Tower → Connection still shows the site as not connected), Beacon's gate still shows
   the Connect button, nothing retries or loops.
5. **Disconnect and reconnect** (official). Tower → Connection → disconnect the Webflow workspace → Beacon on
   beacon-demo shows the authorize gate; Tower makes no Data API call for that workspace (a revoked token is
   revocation, never retried). **Relink Webflow** → connected again; Beacon unlocks after the workspace
   confirmation.
6. **Uninstall cleanup** (guideline "App-delivered code and injected scripts": on uninstall remove the Custom
   Code you registered at site and page level and delete Webflow-side data the App applied; where automatic
   removal is impossible, give removal instructions). Do this on a page that is **not** the review page, or
   before step 7. Place a slot list on a scratch page, Sync, publish; then **Delete target** on the last list
   on that page. Expected: the toast reports the runtime was removed from the page and tells you to publish;
   after publishing, `node scripts/webflow-runtime-observe.mjs <scratch page>` lists no Beacon script; the
   hidden wrapper block and the `beacon_list_*` elements are gone from the Designer. If Beacon cannot remove
   the page entry automatically the toast says so and names the manual path, and the notes (APP-DELIVERED
   CODE) carry the same removal path. The App-level uninstall in Webflow's Apps & Integrations revokes the
   token; Tower treats the next persistent 401 as revocation and stops calling.
7. **Final published-site runtime state** (what the reviewer and Preflight see). The review page
   `https://beacon-demo.webflow.io/blog/the-power-of-resilience` must carry the current bundle's runtime,
   registered, applied and published. Done 2026-10-25 (forced Sync + publish). Verify, and copy the values
   into Step 5:

```bash
node scripts/webflow-runtime-observe.mjs https://beacon-demo.webflow.io/blog/the-power-of-resilience   # exit 0: Beacon requested 0 scripts, integrity matches
node scripts/webflow-runtime-pin.mjs     https://beacon-demo.webflow.io/blog/the-power-of-resilience   # exit 0: "✓ matches", "trailing newline: no", source map "✓ v3"
```

   **From here until the decision: no Sync, no republish of the review page, no Tower push that changes
   behaviour.** A forced Sync mints a new asset and SRI and invalidates the Step 5 runtime values and the
   receipt.
8. **Core workflows smoke** (official "test every core workflow"): image editor — select an image, crop,
   export WebP, **Place** on the canvas (AVIF only after the consent prompt); CMS Slots — create a list,
   compose, Save, Sync, see the list render on the published page; Settings — workspace switch, privacy
   panel. No placeholder copy, no test data visible, no console error from a Beacon file.
9. **Localized sites**: a site with a secondary locale shows the "CMS writes are not available on localized
   sites" message instead of writing (R8.6); the listing states this.

### Step 5 — App Review Preflight on the exact bundle and review ZIP (official "App Review Preflight receipt")

Open **App Review Preflight** in the Designer ([install it into the Workspace](https://webflow.com/oauth/authorize?response_type=code&client_id=0b5411e62233387925e082350666ef374377f81a9abba0dcc2542d6b5b1e4388&scope=authorized_user%3Aread) if missing).
The receipt is required for this update (it changes code), and the form acts on the result: `ready` and
`needs_review` are accepted (a reviewer checks the manual items); `changes_required` **blocks submission**
until every Blocker and Required update is fixed and Preflight is rerun. Run it on the Step 2 bundle and the
Step 2 review ZIP — the same files the form gets.

**Bundle scan** — observed 2026-10-25 on the 10-21 zip (ruleset 1.7.0): four items, no Blocker, no Required
update, readiness `needs_review`. Rerun on the 10-26 zip + review ZIP; the same four items are expected (the
10-26 change removed map-only source, not bundle code), each explained in the notes (Step 8):

| Item | Label | Evidence | Why it is expected |
| --- | --- | --- | --- |
| Keyboard Shortcut | REVIEW (manual) | `assets/label-*.js`, `assets/separator-*.js` | Rule `UX-NO-KEYBOARD-SHORTCUTS`, matcher `modifier-plus-key` (MEDIUM): a modifier flag and a `.key ===` in one expression. Both are Radix UI a11y handlers — the dialog focus trap (`Tab` with no modifier) and Select/Menu typeahead (ignores modified keys). Beacon registers no key listener and no shortcut; the published-runtime debug toggle is stripped (`bDbgRuntimeInfo` stub, 0 `keydown` in the zip). |
| External API Calls | SUGGESTED | `assets/label-*.js:41` | The single Tower `fetch(` (R8.24). |
| Runtime Base64 Decoding | SUGGESTED | `bundle.js:365` ×2, `assets/label-*.js:41` | Rule `SEC-RUNTIME-DECODING` (LOW): data only — `cms-slot-data-list-display.ts` / `cms-slot-designer-slot-props.ts` (display name + slot-props JSON behind `b64:`, custom attributes reject `"`), `cms-slot-page-inline-script.ts` (SRI base64), zod's JWT header check. Record open decision (c). |
| Site Mutation Without User Action | SUGGESTED | `bundle.js:27`, `:369`, `:371` | Rule `UX-NO-MUTATION-ON-LOAD` (LOW), regex on `webflow.create*(`. All six `createStyle`/`createAsset` sites descend from a button (Create, Install on page, Make editable, Place on canvas, composer Save, Sync, image Place, delete confirm); no `useEffect` reaches them. |

Any **Blocker** or **Required** label → stop, [playbook.md](playbook.md) § B, fix, rebuild (Step 2),
re-upload (Step 3), rerun.

**Test the published runtime** — values from Step 4.7:

| Field | Paste |
| --- | --- |
| Published Webflow test URL | `https://beacon-demo.webflow.io/blog/the-power-of-resilience` |
| Webflow installation or site ID | prefilled — `6a35c562c551e2eb11bc4f1c` |
| Runtime file 1 — Versioned runtime URL | `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/6ade7fa552ec2a2781d649bf_codalyn-beacon-runtime-a845ca3b.js` (synced + published 2026-10-25; replaces the 09-18 `…9b7da263.js`) |
| How runtime file 1 loads | Loaded directly by the published page |
| SHA-256 | `979e38a590233cd4d6d8f306541c9ef9d9aa0ccb44047cb566afff7cc38e64fd` |
| Script integrity (SRI) | derived by the form — must equal `sha256-l544pZAjPNTW2PMGVBye+dmqDMtEBHy1Zq//fMOOZP0=` (served tag matches, `crossorigin="anonymous"`; source map `…6ade7fa3d308557e5785dc39_codalyn-beacon-runtime-a845ca3b.map.json`, v3, 24831 bytes) |
| More runtime files | leave empty |
| Does your app proxy or fetch another URL for customers? | No |
| Ready selector | `[data-beacon-target="list"][data-cb-rendered="1"]` |

Expected result rows (R8.24): *Runtime is not traceable to source* gone; *Script integrity is missing or
wrong* may persist (tool-side request-time snapshot, reproduced with `scripts/webflow-runtime-sri-replica.mjs`
— keep the output); *New script elements / Unreviewed scripts* = Webflow's own site runtime on our asset's CDN
host. Preflight observations are evidence from the Webflow-controlled run, never acceptance.

Copy the receipt — `wfpre_` + 32 hex characters — into Step 8. A new bundle, a new runtime registration or a
scope change means a new run and a new receipt.

### Step 6 — Demo video (official "Demo video"; Hybrid content requirements)

The finding this round was the sign-in and OAuth flow, and the video must match the App's actual behaviour
(listing/behaviour match; "Review integrity"). Record a new one on the installed 10-21 version:

- 2 to 5 minutes, English (or English subtitles), private link (Loom private, YouTube unlisted/private, or a
  Google Drive share).
- Install → setup → core features: the install from Tower's Install URL, the Webflow consent screen
  **approved** and, in a second pass, **denied** (Hybrid Apps must show both), the Designer sign-in restoring
  the account with no second OAuth (Step 4.1–4.2), the explicit **Connect site in Webflow** control for a
  site outside the grant (Step 4.3), a CMS slot list composed, synced, published and rendering on the
  published page, an image placed, and **Delete target** removing the runtime with the publish prompt.
- Describe the Webflow integration: Data API through Tower (CMS reads and writes, assets, registered scripts
  and page custom code), Designer API in the extension; name the one backend host and the hosted runtime;
  state pricing (free tier, paid seats) and the AVIF-via-Tower opt-in.

Put the link in the form (Step 8) and in the compliance record.

### Step 7 — Publish the version for review from the Workspace (official "If you update a Designer Extension, publish a new version from your workspace")

Workspace settings → Apps & Integrations → Beacon → **Publish extension version** → the **same Step 2
bundle** → **Publish new version to the App Marketplace (submit for review)** → version notes → submit.
Confirm the version manager shows it as submitted for review. The form in Step 8 has no bundle upload; this is
how the bundle reaches the reviewer. Describe any scope change in the version notes (none this round).

Version notes (≤ 500 characters, plain text, no angle brackets; 497 with the four pre-filled headings):

```
# New Features
None.

# Changes/Fixes
Answers the 2026-09-28 review: the Webflow user who approves OAuth is linked to the Tower account that installed, so Designer sign-in restores that account and its authorization by user ID, never by email; OAuth is never re-triggered on sign-in. Consent and Tower links are prepared only on the user's click.

# Improvements
One-URL image gate (srcset), exact OAuth origin allowlist, hosted script URL validated before registration.

# Resolution notes
Detail in the form.
```

### Step 8 — The submission form (official "Submission form" and "App Update submissions")

<https://developers.webflow.com/submit>. The form runs checks and names the field that fails.

| Field | Value |
| --- | --- |
| Submission type | **App Update** |
| Does this update include a new or changed app bundle? | **Yes** (this makes the review ZIP required) |
| App Name | Beacon |
| Client ID | the production App's — *Edit App* in Workspace settings; never the `.env.local` dev id |
| Marketplace visibility | unchanged |
| Published testing site | `https://beacon-demo.webflow.io` (https; the Step 3 version installed; review page published with the runtime) |
| Install URL (Hybrid) | unchanged — `https://tower.codalyn.app/api/integrations/webflow/authorize` |
| Source map artifact | the Step 2 **review ZIP** (`…sourcemaps.zip`: maps + `package.json` + lockfile). Upload the file; a link in notes does not count |
| App Review Preflight receipt | the Step 5 `wfpre_…` code |
| Demo video | the Step 6 link |
| Review access | the reviewer's Tower account credentials and the Webflow test user, in the form only — never in this repo. The existing `marketplaceteam@…` account keeps working: Tower resolves the approver of last round's token lazily, so no relink is needed |
| Pricing | unchanged; the notes restate it (free tier, paid seats, AVIF opt-in via Tower) |
| Data Client attestations | if the form shows the three attestation controls (token encrypted at rest; stored server-side only; deleted on uninstall or revocation) complete them; the notes carry the same three sentences either way |
| Listing copy, scopes, support fields | untouched — "complete only the fields you're changing" |
| Additional notes | the block below, pasted as is |

**Additional notes** (max 5000 characters — 4988 now; the WAF blocks angle brackets, key-equals-value pairs,
DOM API names and `/*` — the block avoids them):

```
WHAT CHANGED (bundle v0.1.0 built 2026-10-26 from the 09-28 source) answers the 2026-09-28 feedback, items 1 to 5. Round-8 changes are unchanged.

1. Repeated sign-in and OAuth after installation. Identity is the Webflow user ID, never the e-mail. When an OAuth completes (install, Tower relink, or the Designer-started consent), Tower calls token authorized_by, records the approving Webflow user and the Tower account that completed the OAuth, and links them. When the Designer extension resolves an ID token, Tower signs the user into the account linked to that Webflow user ID; if none is linked yet it finds the workspace whose stored authorization that user approved, signs them into the installing account, and links the two. A Tower account and a Webflow account with different e-mails therefore work as one. The silent run on load is tagged restore and creates or links nothing; e-mail linking and account creation happen only on the Continue with Webflow click. OAuth runs once at install or on the explicit control in item 2; routine sign-in never re-triggers it. Tower deploy and migration are live.

2. Authorization URL after a user action. Nothing is requested when a gate mounts. The Connect site in Webflow button mints the authorize URL and OAuth state on the click; Open Webflow authorization is then an ordinary new-tab link. The same two-step control serves the Open Tower link on the no-workspace screen. Unit tests pin zero Tower requests at mount and exactly one per click.

3. Image srcset. The published-site image gate accepts exactly one URL; whitespace or a trailing comma refuses the whole value everywhere (img, picture sources, CSS background). This changed the published-site runtime; its integrity hash and source map were regenerated by the sync.

4. OAuth URL allowlist. The consent link is accepted only for origin exactly https://webflow.com, path exactly /oauth/authorize, empty credentials; non-default ports, sub-paths and trailing slashes are refused.

5. Hosted script URL. The hosted location from the create-asset call is validated before use and again before registration: HTTPS, a Webflow asset host, no credentials, no non-default port, no whitespace. A malformed value fails the sync instead of being registered.

TESTING (reviewer flow): sign in to Tower with one account, complete the Webflow authorization as a Webflow user with a different e-mail, open Beacon on the authorized site as that user: the panel restores the Tower account that installed, asks once to confirm the workspace, and unlocks. Sign out and Continue with Webflow returns to the same account without OAuth. Denying the Webflow authorization returns to Tower with a message and stores nothing.

APP-DELIVERED CODE: one hosted script, registered through the Custom Code API with a SHA-256 integrityHash and applied page-level (footer) only to pages where the user placed a CMS slot list. It renders CMS list content the user composed in the Designer, loads no other resource, makes no request, and is served unminified with a version-3 source map beside it. It is registered only by the user's Sync or Save action; a new runtime ships only as a new registered version with an app update. Removal: Delete target in the app removes the page custom code entry and the Designer elements; the user is then told to publish. Webflow-side data the app applied (the beacon styles and placeholder asset) are removed by the same action.

DATA CLIENT ATTESTATIONS: the Webflow OAuth token is encrypted at rest (AES-256-GCM); it is stored and used server-side only and never reaches the extension, a response body or a log; it is deleted on uninstall or revocation, and a persistent 401 on a stored token is treated as revocation and stops all Data API calls for that workspace.

PREFLIGHT (ruleset 1.7.0): Keyboard Shortcut, manual review, two vendor chunks: Beacon binds no shortcut and registers no key listener; both matches are Radix UI accessibility handlers, the dialog focus trap (Tab, no modifier) and Select and Menu typeahead (ignores modified keys). Runtime Base64 Decoding, suggested: data only, never code (slot display name and slot-props JSON behind a prefix because custom attributes reject double quotes, the integrity string, zod's JWT header check). Site Mutation Without User Action, suggested: every create call descends from a button (Create list, Install on page, Make editable, Place on canvas, Save, Sync, image Place, delete confirmation); nothing runs on load or a timer. External API Calls, suggested: one request helper, HTTPS to Tower only. Published-runtime test: the Script integrity row is tool-side (request-time DOM snapshot before the parser inserts the tag, reproduced locally); unreviewed rows are Webflow's own site runtime on the same CDN host.

BACKEND (Hybrid): https://tower.codalyn.app only, HTTPS, production, live for the whole review. Other destination: the presigned upload URL granted per create-asset response. No telemetry host.
```

Record the Webflow reference id from the confirmation e-mail in the compliance record, then commit the docs.

### Step 9 — After submitting (official "After submitting")

- Webflow e-mails a confirmation and aims for a decision within 10 business days, to the account's e-mail.
- Until then: Tower stays up and unchanged in behaviour; the review account, the test site and its published
  runtime stay exactly as filed; no Sync, no republish of the review page, no new bundle unless asked.
- Reply on the existing thread (ticket #1197949) if the team asks; the one-line answers:
  - **Sign-in / OAuth** — identity is the Webflow user id, recorded at OAuth completion via `token/authorized_by` and linked to the installing account; Designer sign-in restores that account; e-mail is never consulted on that path; OAuth starts only from the explicit Connect control for a site outside the grant.
  - **Authorize URL** — minted on the "Connect site in Webflow" click, never on mount; the consent screen is a plain new-tab anchor; tests pin zero mount-time requests.
  - **srcset** — one URL only; whitespace or trailing comma refuses the value everywhere.
  - **OAuth allowlist** — exact origin, exact path, empty credentials.
  - **Hosted script URL** — validated for HTTPS Webflow asset origin, no credentials, no non-default port, before upload use and before registration; SRI unchanged.
- **Changes requested**: fix every listed item **and** anything from earlier rounds, retest the whole App
  (Step 4), rebuild, and go back to Step 2. Repeated submissions that ignore earlier feedback can pause new
  submissions for the App.
- **Approved**: the version goes live; record "Reviewer accepted" in the compliance record.

### Listing

Unchanged from round 8 (the localization and telemetry sentences are already in the listing; the listing
states that the App applies a page-level script to pages with slot lists). Nothing to update this round.

## Rebuild (only if source changes again)

```bash
CI=true BUILD_PURPOSE=marketplace pnpm --filter beacon build:prod
```

A new zip means: new hashes and artifact checks (Step 2), a new internal-testing upload and Launch App check
(Step 3), the full retest (Step 4), a new Preflight run and receipt (Step 5), a new Marketplace publish (Step
7) — and, if the CMS Slots runtime source changed, a new forced Sync + publish and new Step 5 runtime values.
