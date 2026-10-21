# SUBMIT — Round 9 runbook (App Update answering the 2026-09-28 review feedback, ticket #1197949)

> **2026-09-28 — feedback on the 09-26 filing (ref `1d3acdf7-fdb1-4e03-8a62-e5016224b64a`).** One finding with
> four sub-findings, all fixed in code (compliance-record.md Round 9, R9.1–R9.5). The main one is server-side:
> **Tower must be deployed and migration 0038 applied before anything is installed or tested (Step 1 — migration
> applied and code pushed 09-28; confirm the CI deploy before Step 4).** The
> published-site runtime changed (R9.3), so the test site needs a **forced Sync + publish** this round (Step 4)
> and new Preflight runtime values (Step 5). Step 3 is done (2026-10-21 16:02 build, hashes below); next is Step 4.
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

### Step 1 — Migrate, then push: a push to `main` is the Tower deploy (finding 1 is server-side)

`git push` of `main` **is** the production deploy: the CI job `deploy-tower` runs `vercel deploy --prod` after
`verify` is green (about 15 minutes; Vercel's own git auto-deploy is off so only CI-green code ships). Nothing
in that pipeline runs migrations — not CI, not the Vercel build. So the order is migration first, push second:

```bash
pnpm --filter tower db:migrate:prod -- --confirm   # applies 0038_webflow_token_authorizer (two nullable columns + index + FK on organization_webflow_oauth_token)
pnpm --filter tower db:migrate:status:prod         # read-only: must report 39/39 applied, exit 0
git push origin main                               # CI: verify → deploy-tower
```

The migration is additive, so it is safe ahead of the deploy (the old code ignores the columns). The reverse
order is not safe: the new `POST /api/auth/webflow-designer` and the OAuth callback read and write the new
columns, so a deploy that lands before the migration fails every Beacon open with a column error (the Data API
proxy reads select explicit columns and would keep working).

**State 2026-09-28:** commit `7db30cd9` (all of round 9) pushed 17:12 EDT; migration 0038 applied by Miles by
hand while CI `verify` was still running (the push had been made on the belief that it runs migrations — it
does not; rule now in CLAUDE.md); `pnpm --filter tower db:migrate:status:prod:vercel` at 21:23Z → **39/39 applied**.
CI run 36484535449 `deploy-tower`: success 21:27:49Z (deployment `codalyn-tower-mp1v74bjs`, aliased to codalyn.app / tower.codalyn.app; `/api/health` → `{"ok":true,"service":"tower"}` at 21:27:54Z). Step 1 is complete; the three checks below were run at 21:28Z and passed.

Verify before Step 4: `gh run view 36484535449` shows `deploy-tower: success`;
`curl -s https://tower.codalyn.app/api/health` answers `{"ok":true,"service":"tower"}`;
`pnpm --filter tower db:migrate:status:prod` reports nothing pending. Manual fallback only if CI is red:
`vercel deploy --prod --yes` from the repo root.

The installed 09-26 bundle keeps working against the new Tower (untagged exchange requests are treated as
the full sign-in), so the deploy can go out before the new bundle is installed.

### Step 2 — Commit

Done for round 9: `7db30cd9` (2026-09-28 17:12 EDT) holds the Tower files in the table above with their
tests, `drizzle/0038_webflow_token_authorizer.sql` + `drizzle/meta/_journal.json` + `drizzle/meta/0038_snapshot.json`,
the Beacon files in the table with their tests and stories, `docs/webflow-marketplace/compliance-record.md`
(Round 9), this file and `history/responses.md`. (The review email PDF committed there was removed the same
evening — the thread lives in ticket #1197949; nothing from it belongs in the repo.) Any further source change gets
its own commit before Step 3, so the artifact hash maps to a commit.

### Step 3 — Build the Marketplace artifact

```bash
CI=true BUILD_PURPOSE=marketplace pnpm --filter beacon build:prod
```

Only this command writes to `apps/beacon/bundle/production/public/`. Record here, then in the compliance
record, the two file names and `shasum -a 256` of both. Anything you build to test a fix is
`pnpm --filter beacon build:prod` (recipient `internal`) and never goes in that folder. Then run the
[playbook](playbook.md) § A4 greps on the zip: expected `window.open(` 0 · `MutationObserver` 0 ·
`postMessage(` 0 · `sourceMappingURL` 0 · `ws://` 0 · posthog/sentry/localhost 0 · bare `fetch(` 1 · `http://`
only the W3C namespace literals React needs (`www.w3.org/…`, R6.6).

- Build to submit: `v0.1.0_public_10-21_16-02-02.zip` — sha256
  `731b9dd02f0007f0daaa6bebec0e93fcc6ae0a4c7a3ce3f0776248a33e60f071` (built 2026-10-21 16:02 EDT at commit
  `3d4b2cb`; source identical to `7db30cd9` + the review-ZIP build change; greps all as expected, `fetch(` 1,
  `http://` only the W3C namespaces; `restore`/`sign_in` intents and `no_tower_account` present).
- Review ZIP (form field "Source map artifact"): `v0.1.0_public_10-21_16-02-02.sourcemaps.zip` — sha256
  `3f36162e8a7d1b1bfc17369e0e1281e7107f80e4b6019dfd4e28cfd9ccada529` (7 maps + `package.json` + `pnpm-lock.yaml`,
  verified with `unzip -Z1`). Since the
  2026-10-16 toolkit (Preflight ruleset 1.7.0) this zip carries the `.map` files **plus** `package.json` and
  `pnpm-lock.yaml` from the build; `build-cli` assembles it and fails if either is missing. Check with `unzip -l`.

### Step 4 — Install on the test site and reproduce the reviewer's flow

1. Workspace settings → Apps & Integrations → Beacon → **Publish new version** → upload the zip from Step 3 →
   **"Publish for internal testing (Workspace only)"** → publish. (The submission publish is Step 6a; using
   the submission zip here is deliberate — Steps 4–5 must exercise the exact artifact.)
2. **Two accounts, different e-mails.** Tower account **A** (e-mail `a@…`, workspace admin of the workspace
   that will hold the grant) and a Webflow user **W** (e-mail `w@…` ≠ `a@…`) who is an admin of the Webflow
   workspace owning beacon-demo. This is the reviewer's setup (Tower `marketplaceteam@…`, Webflow "Shea").
3. **Install-time authorization as W from A's session.** In a browser signed in to Tower as A: Tower →
   Connection → **Relink Webflow** (this is the same cookie flow as the Marketplace install URL) → approve on
   webflow.com **as W** → back on Tower, *Connected*, beacon-demo listed. Tower has now recorded W as the
   approver and linked W to account A (R9.1).
4. **Open Beacon in the Designer as W** (fresh Designer tab, extension never signed out on this profile).
   Expected, with no click: the panel goes straight to **Confirm your workspace → Use this workspace** (A's
   workspace) — **no welcome screen**. DevTools → Network filtered to `tower.codalyn.app`: one
   `POST /api/auth/webflow-designer` (body carries `"intent":"restore"`, answer 200), the session read, the
   settings pull; nothing to `/api/integrations/webflow/authorize`. Click **Use this workspace** → the app
   unlocks (beacon-demo is in the grant). **No OAuth screen at any point.** If the welcome screen shows
   instead → stop: Tower is not deployed/migrated (Step 1), or W's approval went to a different workspace.
5. **Routine sign-in preserves the authorization.** Header menu → **Sign out** → welcome screen → **Continue
   with Webflow** (Network: `POST /api/auth/webflow-designer` with `"intent":"sign_in"`) → the same account A,
   same workspace confirmation, app unlocks, no OAuth.
6. **New authorization is explicit.** Open Beacon (as W, signed in) on a site **outside** the grant. Expected:
   "Authorize this site in Webflow" with the **Connect site in Webflow** button and, in Network, **no** request
   to `/api/integrations/webflow/authorize` until the click. Click → "Preparing…" → **Open Webflow
   authorization** anchor (`target=_blank`); Network shows exactly one `POST …/authorize`. Open it, approve,
   return → Beacon unlocks on its own. Optional: wait 8+ minutes on the ready anchor, hover it → it turns back
   into the Connect button with no request.
7. **Zero-workspace gate (only if you have such an account):** "No Tower workspace yet" shows **Open Tower**
   as a button; Network shows no `one-time-token/generate` until the click; after it, **Continue to Tower** is
   an anchor whose `href` carries `#ott=` (fragment, never `?ott=`).
8. **Runtime re-push (the page runtime changed, R9.3).** CMS Slots → the page runtime **Sync** button (the
   forced path is intended this round) → it uploads the source map then the JS and registers the new hosted
   script. Extension console must show no egress error. Then **Publish** the site. Confirm from the terminal:

```bash
node scripts/webflow-runtime-observe.mjs https://beacon-demo.webflow.io/blog/the-power-of-resilience   # exit 0: Beacon requested 0 scripts, integrity matches
node scripts/webflow-runtime-pin.mjs     https://beacon-demo.webflow.io/blog/the-power-of-resilience   # exit 0: "✓ matches", "trailing newline: no", source map "✓ v3" — copy URL / SHA-256 / SRI into Step 5
```

9. Console residue: only the two Webflow-client CSP lines (R7b.15, R8.25). Any CSP line naming a Beacon
   file, or any Tower request error → stop and record it.

### Step 5 — App Review Preflight

Open **App Review Preflight** in the Designer ([install it into the Workspace](https://webflow.com/oauth/authorize?response_type=code&client_id=0b5411e62233387925e082350666ef374377f81a9abba0dcc2542d6b5b1e4388&scope=authorized_user%3Aread) if missing).

**Bundle scan** — upload the Step 3 zip and its `.sourcemaps.zip`. Expected: **exactly one item, "External
API Calls" (REQUIRED), 1 evidence location** (the single Tower `fetch(`; R8.24 explains the excerpt offset).
Anything else → stop, [playbook.md](playbook.md) § B. Copy the receipt (`wfpre_…`) into Step 6.

**Test the published runtime** — new values this round (from the pin script in Step 4.8):

| Field | Paste |
| --- | --- |
| Published Webflow test URL | `https://beacon-demo.webflow.io/blog/the-power-of-resilience` (or the bare test page) |
| Webflow installation or site ID | prefilled — `6a35c562c551e2eb11bc4f1c` |
| Runtime file 1 — Versioned runtime URL | _(fill in)_ the new `…codalyn-beacon-runtime-<hash>.js` URL from the pin script — **not** the 09-18 `…9b7da263.js` |
| How runtime file 1 loads | Loaded directly by the published page |
| SHA-256 | _(fill in from the pin script)_ |
| Script integrity (SRI) | derived by the form — must equal the pin script's SRI |
| More runtime files | leave empty |
| Does your app proxy or fetch another URL for customers? | No |
| Ready selector | `[data-beacon-target="list"][data-cb-rendered="1"]` |

Expected result rows as in round 8 (R8.24): *Runtime is not traceable to source* gone; *Script integrity is
missing or wrong* may persist (tool-side request-time snapshot — reproduced with
`scripts/webflow-runtime-sri-replica.mjs`, keep the output); *New script elements / Unreviewed scripts* =
Webflow's own site runtime on our asset's CDN host.

### Step 6 — Publish the version for review, then file the form

**6a — Workspace publish (this is what enters review).** Workspace settings → Apps & Integrations → Beacon →
**Publish new version** → the Step 3 zip → **"Publish new version to the App Marketplace (submit for review)"**
(not internal testing) → version notes below → **Submit for review**. The version manager must show it as
submitted for review.

Version notes (this field is the 500-character one; plain text, no angle brackets; 497 characters with the
four pre-filled headings):

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

**6b — The form.** <https://developers.webflow.com/submit> → App Update → *App functionality, permissions, or
bundle*, on the same email thread (ticket #1197949). Required: App Name, Client ID (production app — copy from
Workspace settings → Apps & Integrations → Beacon → *Edit App*; never the `.env.local` dev id), the published
`.webflow.io` testing site with this build installed, the review ZIP from the exact build (the Step 3
`.sourcemaps.zip`: maps + `apps/beacon/package.json` + root `pnpm-lock.yaml` at the build commit — the form's
"Source map artifact" field; one upload covers all three), Preflight receipt. Leave listing copy, install URL, scopes, pricing and support fields
untouched; nothing about them changed. Reviewer credentials go in the form only, never in this repo; the
reviewer's existing Tower account (`marketplaceteam@…`) and its workspace keep working: Tower resolves the
approver of the token stored last round lazily, so the reviewer does not have to relink.

**Additional notes** (form field, max 5000 characters; the WAF blocks angle brackets, key-equals-value pairs,
DOM API names and `/*` — the block avoids them, paste as is):

```
WHAT CHANGED (bundle v0.1.0, 09-28) - answers the 2026-09-28 feedback, items 1 to 5. Round-8 changes are unchanged and still pinned by the release build.

1. Repeated sign-in and OAuth after installation. Identity is now the Webflow user ID, never the e-mail. When an OAuth completes (Marketplace install, Tower dashboard connect or relink, or the Designer-started consent), Tower calls token authorized_by, records the approving Webflow user and the Tower account that completed the OAuth on the stored authorization, and links that Webflow user to that account. When the Designer extension resolves an ID token, Tower signs the user into the account linked to that Webflow user ID; if none is linked yet, it finds the workspace whose stored authorization that Webflow user approved (asking Webflow who authorized the stored token when the record predates this build), signs them into the account that installed it, and links the two for next time. E-mail addresses are not consulted on that path, so a Tower account and a Webflow account with different e-mails work as one. Routine sign-in restores the existing account and its Webflow authorization; OAuth is started only from the explicit control in item 2, for a site outside the existing grant. The extension now tags the silent run on load as restore: Tower signs in an already-linked account or answers no_tower_account, and creates or links nothing; linking a Tower account by its Webflow-verified e-mail and creating a new Tower account happen only on the Continue with Webflow click. Accounts reached by Webflow user ID are never modified (no e-mail verification change, no credential change). The webflow_user_mismatch message now tells the user to sign in with their password and relink Webflow from Tower's Connection page, which performs the same install-time link. Tower deploy and migration included in this update.

2. Authorization URL after a user action. Nothing is requested when the gate mounts. The gate for a site outside the workspace's grant explains that the user is signed in and that this is a new authorization for that site; the Connect site in Webflow button mints the authorize URL and OAuth state on the click, after which Open Webflow authorization is an ordinary new-tab link. A stale URL returns the control to the button rather than re-minting. The same two-step control now serves the Open Tower link on the no-workspace screen (session handoff token minted on the click). Unit tests pin zero Tower requests at mount on every gate screen and exactly one per click.

3. Image srcset. The published-site image gate accepts exactly one URL. Any whitespace or a trailing comma, the srcset candidate separators, refuses the whole value, so a candidate list is written nowhere: not to the img, not to picture sources, not to a CSS background. The value written is the validated string verbatim. This changes the published-site runtime file; its SHA-256 integrity hash and version-3 source map are regenerated by the same sync.

4. OAuth URL allowlist. The consent link is accepted only when url origin is exactly https://webflow.com, the path is exactly /oauth/authorize, and username and password are empty; non-default ports, credentials, sub-paths and trailing slashes are refused (unit-tested).

5. Hosted script URL. The hosted location returned by the create-asset call is validated before the upload result is used and again before registered_scripts hosted: HTTPS, a Webflow asset host (website-files.com and subdomains, webflow.com subdomains), no credentials, no non-default port, no whitespace. A malformed value fails the sync instead of being registered. The SHA-256 integrity hash of the uploaded bytes is unchanged.

TESTING (reviewer flow): sign in to Tower with one account, complete the Webflow authorization as a Webflow user with a different e-mail, open Beacon on the authorized site as that Webflow user: the panel restores the Tower account that installed, asks once to confirm the workspace, and unlocks. Sign out and Continue with Webflow returns to the same account without OAuth.

PUBLISHED-RUNTIME TEST: one page-level hosted script, registered with a SHA-256 integrityHash carried verbatim in the page tag with anonymous crossorigin, served unminified with a version-3 source map beside it. The Script integrity row is tool-side (request-time DOM snapshot before the parser inserts the tag; reproduced locally, also for Webflow's jQuery tag); the served tag and CDN CORS verify correct. Unreviewed rows are Webflow's own site runtime on the same CDN host.

BACKEND (Hybrid): https://tower.codalyn.app only, HTTPS, production. Other destination: the presigned upload URL granted per create-asset response. No telemetry host.
```

If the review team asks about one item by email, the one-line answers:

- **Sign-in / OAuth** — identity is the Webflow user id, recorded at OAuth completion via `token/authorized_by` and linked to the installing account; Designer sign-in restores that account; e-mail is never consulted on that path; OAuth starts only from the explicit Connect control for a site outside the grant.
- **Authorize URL** — minted on the "Connect site in Webflow" click, never on mount; the consent screen is a plain new-tab anchor; tests pin zero mount-time requests.
- **srcset** — one URL only; whitespace or trailing comma refuses the value everywhere.
- **OAuth allowlist** — exact origin, exact path, empty credentials.
- **Hosted script URL** — validated for HTTPS Webflow asset origin, no credentials, no non-default port, before upload use and before registration; SRI unchanged.

### Step 7 — Listing

Unchanged from round 8 (the two localization/telemetry sentences are already in the listing). Nothing to add.

## Rebuild (only if source changes again)

```bash
CI=true BUILD_PURPOSE=marketplace pnpm --filter beacon build:prod
```

A new zip means: new hashes in Step 3, new Preflight scan and receipt, re-install on beacon-demo, and — if
the CMS Slots runtime source changed — a new forced Sync + publish and new Step 5 runtime values.
