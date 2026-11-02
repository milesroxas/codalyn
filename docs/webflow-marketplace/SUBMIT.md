# SUBMIT — Round 9 (App Update, ticket #1197949)

Paste sheet for the current filing. History, evidence and reasons live in
[compliance-record.md](compliance-record.md) Round 9. Do not add status prose here; mark a step done and move on.

## Status

| Step | State | Record |
| --- | --- | --- |
| 0 Prerequisites | done 2026-11-02 | "Step 0 closed" |
| 1 Fixes in source | done 2026-09-28 (`7db30cd9`) | R9.1–R9.5 |
| 2 Artifact | done 2026-10-26 | "2026-10-26 — build-step review" |
| 3 Internal-testing upload + Launch App | done 2026-11-01 | "2026-11-01 — Step 3" |
| 4 Retest | done 2026-11-01 | "2026-11-01 — Step 4 closed" |
| 5 Preflight receipt | done 2026-11-01 (rev 13) | "2026-11-01 — Preflight revision 13" |
| 6 Marketplace publish | **next** | |
| 7 Submission form | after 6 | |
| 8 After submitting | | |

**Frozen until the decision:** no Sync, no republish of the review page, no push to `main` that changes Tower
behaviour. A Sync mints a new runtime and voids the receipt.

## Artifact (Step 2)

| File | sha256 |
| --- | --- |
| `apps/beacon/bundle/production/public/v0.1.0_public_10-26_13-50-30.zip` | `a27f05116aa2ee3dac8daf3a08d301f27f2737ce4c57e735804bd8ab78f773c2` |
| `apps/beacon/bundle/production/public/v0.1.0_public_10-26_13-50-30.sourcemaps.zip` | `1c7ccaedfdd5e694674f6d8196b2a4fa742bcea24964a5d0e5c255971c02f152` |

The 10-21 pair is superseded. Never upload it.

## Step 6 — Publish to the Marketplace

Webflow Workspace settings → Apps & Integrations → Beacon → **Publish extension version** → *Publish new version
to the App Marketplace (submit for review)* → select the bundle zip above → version notes → submit. Confirm
Version History shows it submitted for review. This is how the bundle reaches the reviewer; the form has no
bundle upload.

Version notes (plain text, no angle brackets, ≤ 500 characters with the four headings):

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

## Step 7 — Submission form

<https://developers.webflow.com/submit>

| Field | Value |
| --- | --- |
| Submission type | App Update |
| New or changed app bundle? | Yes |
| App Name | Beacon |
| Client ID | `610625f88e43ac74124bfc1daa2c74c275565490d924b5dc401bc1d47ad158cb` |
| Published testing site | `https://beacon-demo.webflow.io` |
| Install URL (Hybrid) | `https://tower.codalyn.app/api/integrations/webflow/authorize` |
| Source map artifact | upload the `.sourcemaps.zip` above |
| App Review Preflight receipt | `wfpre_609ef17a3807de141e3693357c462354` |
| Demo video | leave as filed last round |
| Review access | reviewer's Tower credentials + Webflow test user, in the form only, never in this repo. The existing `marketplaceteam@…` account works without a relink |
| Pricing, listing copy, scopes, support fields | unchanged, leave blank |
| Data Client attestations | complete the three if shown (encrypted at rest; server-side only; deleted on uninstall or revocation) |
| Additional notes | the block below, as is |

Additional notes (4988 of 5000 characters; no angle brackets, no `key=value`, no DOM API names, no `/*`):

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

After submitting: put the Webflow reference id from the confirmation e-mail in the compliance record and commit.

## Step 8 — After submitting

Decision within about 10 business days. Keep Tower, the review account, beacon-demo and its published runtime
exactly as filed. Reply on ticket #1197949 if asked; one-line answers per finding:

- **Sign-in / OAuth** — identity is the Webflow user id recorded at OAuth completion and linked to the installing account; Designer sign-in restores it; e-mail is never consulted; OAuth starts only from the explicit Connect control.
- **Authorize URL** — minted on the Connect click, never on mount; tests pin zero mount-time requests.
- **srcset** — one URL only; whitespace or trailing comma refuses the value.
- **OAuth allowlist** — exact origin, exact path, empty credentials.
- **Hosted script URL** — validated (HTTPS Webflow asset origin, no credentials, no non-default port) before use and before registration.

**Changes requested** → fix every item plus anything from earlier rounds, then Rebuild. **Approved** → record
"Reviewer accepted" in the compliance record.

## Rebuild (only if source changes)

```bash
CI=true BUILD_PURPOSE=marketplace pnpm --filter beacon build:prod
```

A new zip restarts at Step 2: new hashes here, internal-testing upload + Launch App (Step 3), retest (Step 4), new
Preflight run and receipt (Step 5), new Marketplace publish (Step 6). If the CMS Slots runtime source changed, also a
forced Sync + publish of the review page and new runtime values for Preflight:

```bash
node scripts/webflow-runtime-observe.mjs https://beacon-demo.webflow.io/blog/the-power-of-resilience   # exit 0
node scripts/webflow-runtime-pin.mjs     https://beacon-demo.webflow.io/blog/the-power-of-resilience   # exit 0
```

Full step procedures (Step 0 checklist, artifact greps, two-account retest script, Preflight field values) are archived
in [history/round-9-runbook-full.md](history/round-9-runbook-full.md); copy a step back here only when it reopens.
