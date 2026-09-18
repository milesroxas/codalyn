# SUBMIT — Round 8 runbook (App Update answering the 2026-09-17 review feedback)

**Build under review:** `v0.1.0_public_09-17_19-58-15.zip` (built 2026-09-17 19:58). Everything on this page is for this build only.
Why each thing is the way it is: [compliance-record.md](compliance-record.md) Round 8, R8.1–R8.12.
Anything Preflight shows that is not listed under step 4 or step 5 below → stop and follow [playbook.md](playbook.md) § B.

## What the six findings became in code

Every finding is a code change you can point to; none is answered with an explanation alone.

| # | Review finding | What changed | Where |
| --- | --- | --- | --- |
| 1 | Workspace persisted without user interaction | Auto-POST effect deleted; a single workspace is only a local suggestion with a **Use this workspace** button. Tower no longer defaults a workspace onto extension sessions (bearer sessions resolve with no membership fallback and no write) | Beacon `settings/model/beacon-app-settings-provider.tsx`, `settings/ui/beacon-workspace-control.tsx` · Tower `server/resolve-active-organization-id.ts`, `server/billing/session-org.ts`, `server/beacon-settings-context.ts` |
| 2 | Telemetry without redaction | Redaction handler wired as PostHog `before_send`, unit-tested with synthetic secrets. On top: the Marketplace build ships no telemetry SDK at all (release flag off; build gate forbids any trace) | `shared/lib/telemetry-event-redaction.ts`, `shared/lib/init-observability.ts`, `shared/lib/beacon-release-flags.ts` |
| 3 | Redirects followed | `redirect` pinned to `error` at the single fetch site; callers cannot override | `shared/lib/extension-egress.ts` |
| 4 | Any S3 bucket accepted | Exact `uploadUrl` granted once per create-asset response; CSP `connect-src` names the bucket path (`https://s3.amazonaws.com/webflow-prod-assets`), never the bare host | `shared/lib/extension-egress.ts`, `shared/lib/webflow-asset-upload-endpoint.ts`, `shared/lib/beacon-extension-csp.ts` |
| 5 | `unsafe-inline` styles | Removed; `style-src-attr 'none'`; every Storybook story rendered under the enforced policy with zero Beacon violations | `shared/lib/beacon-extension-csp.ts`, `apps/beacon/scripts/csp-style-audit.mjs` |
| 6 | No locale on CMS writes | `cmsLocaleId` (primary locale) on every CMS write and the staged read; sites with secondary locales are refused before any request; listing states it | `shared/lib/webflow-cms-write-locale.ts`, image-editor `apply-cropped-export.ts`, cms-slots `cms-slot-list-cms-composition-save.ts` |

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
   `apps/beacon/bundle/production/public/v0.1.0_public_09-17_19-58-15.zip`.
2. Open Beacon on **beacon-demo**. The panel must render; the extension console must show **no CSP violation**.
3. Sign in. With one workspace you must see **Use this workspace** — click it.
   If the workspace is already active without a click, Tower is not deployed yet → Step 1.
4. CMS Slots → page runtime **Sync** on `/blog/the-power-of-resilience`. It must succeed — this is the presigned upload under the new `connect-src`.
   A `connect-src` violation here means Webflow's `uploadUrl` is not the documented `https://s3.amazonaws.com/webflow-prod-assets`: copy the exact URL from the console into the compliance record before touching anything.
5. **Publish** the site.
6. Confirm the page from the terminal:

```bash
node scripts/webflow-runtime-observe.mjs https://beacon-demo.webflow.io/blog/the-power-of-resilience   # must exit 0: Beacon requested 0 scripts, integrity matches
node scripts/webflow-runtime-pin.mjs     https://beacon-demo.webflow.io/blog/the-power-of-resilience   # must print "✓ matches"; note the runtime file name + SHA-256
```

The runtime is unchanged since 09-14, so the pin script should print the same file and hash used in Step 5. If it prints different ones, use the printed values there.

### Step 4 — App Review Preflight: bundle scan

Open **App Review Preflight** in the Designer ([install it into the Workspace](https://webflow.com/oauth/authorize?response_type=code&client_id=0b5411e62233387925e082350666ef374377f81a9abba0dcc2542d6b5b1e4388&scope=authorized_user%3Aread) if it is missing).

1. Upload both files from `apps/beacon/bundle/production/public/`:
   - bundle → `v0.1.0_public_09-17_19-58-15.zip`
   - source maps → `v0.1.0_public_09-17_19-58-15.sourcemaps.zip`
2. Expected **Review feedback: exactly one item, "External API Calls" (REQUIRED), 1 evidence location** in `assets/label-*.js`.
   That is the extension's single backend call (Hybrid App: Tower). It cannot go away while the app has a backend; the notes in Step 6 disclose it. The excerpt's position moves between scans (it has sat on the storage cleanup, then on the Tower policy-page links) — the rule is the same.
3. Anything else — a second item, "Silent Canvas Mutations", an External API Calls excerpt outside the `label-*.js` chunk — → stop, [playbook.md](playbook.md) § B.
4. Copy the receipt code (`wfpre_…`) into Step 6. (It was issued with this item present on 09-14.)

### Step 5 — App Review Preflight: "Test the published runtime"

Fill exactly these values, save the test setup (it binds to the uploaded bundle), run the test.

| Field | Paste |
| --- | --- |
| Published Webflow test URL | `https://beacon-demo.webflow.io/blog/the-power-of-resilience` |
| Webflow installation or site ID | prefilled by Preflight — `6a35c562c551e2eb11bc4f1c` |
| Runtime file 1 — Versioned runtime URL | `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/6aa881c9d6e9e70f262ea057_codalyn-beacon-runtime-1ebc5741.js` |
| How runtime file 1 loads | **Loaded directly by the published page** |
| SHA-256 | `6f3be0f588c2045a90034555b0375cb082b40d42b94520a2f6679f1ed55795d3` |
| Script integrity (SRI) | derived by the form — must read `sha256-bzvg9YjCBFqQA0VVsDdcsIK0DUK5RSCi9mefHtVXldM=` |
| More runtime files | leave empty — Webflow's own scripts are not pinned (decision R7b.16) |
| Does your app proxy or fetch another URL for customers? | **No** |
| Ready selector | `[data-beacon-target="list"][data-cb-rendered="1"]` |

Expected result — the same four items as every run since 09-14. **Change nothing for them**; they are answered in the notes (PUBLISHED-RUNTIME TEST paragraph).

| Result | Why it is expected |
| --- | --- |
| Script integrity is missing or wrong | Tool-side. The tag carries the exact SRI with `crossorigin="anonymous"` (pin script ✓) and Preflight's own row says **Hash matched**. Three distinct valid pins have been rejected the same way (R7b.19). |
| New script elements were created · Unreviewed scripts loaded (`webflow.<site>.<hash>.js`, `webflow.achunk.*`, `gsap.min.js`, `ScrollTrigger.min.js`) | Webflow's own published-site runtime, present on every Webflow page. Beacon loads none of them. Not pinned by decision (R7b.16). |
| Runtime is not traceable to source | The runtime is served unminified; it is its own source. |

Runtime file row should read: **Loaded ✓ · Hash matched ✓ · SRI mismatch ✗ · No source map ✗**.
If a reviewer explicitly asks for Webflow's platform scripts to be pinned: [history/webflow-platform-script-rows-2026-09-14.md](history/webflow-platform-script-rows-2026-09-14.md) — re-run the observe script first, the values change on every publish.

### Step 6 — Submit the App Update

Webflow app settings → Publish → **Upload Bundle for Review**, then the submission form (App Update; reply in the same email thread).

| Field | Value |
| --- | --- |
| Submission type | App Update |
| App name | Beacon |
| New or changed bundle? | Yes |
| Designer Extension bundle | `apps/beacon/bundle/production/public/v0.1.0_public_09-17_19-58-15.zip` — sha256 `6f731eb7c744233aee15c7fe33e6da4719433a98282e5b86ce47608bbbe0a067` |
| Source maps (private field only, never the bundle) | `apps/beacon/bundle/production/public/v0.1.0_public_09-17_19-58-15.sourcemaps.zip` — sha256 `50562fe4a012a0ac0c6fe248b573048af7214d6255312ab855da144c179c075b` |
| Package manifest + lockfile | `apps/beacon/package.json` + root `pnpm-lock.yaml` as committed at the build commit |
| App Review Preflight receipt | the `wfpre_…` code from Step 4 |
| Testing site | `https://beacon-demo.webflow.io` — bundle above installed; beacon page `https://beacon-demo.webflow.io/blog/the-power-of-resilience` |
| Reviewer credentials | enter in the form only, never in this repo; 2FA on a Workspace admin account |

**Response to the review team** (form limit 500 characters; this is 499). Paste as is:

```
1) No automatic workspace request: a lone workspace is only suggested and saved on the user's click; the server sets no default for extension sessions. 2) No telemetry SDK in this build; a redaction handler covers builds with one. 3) All requests use redirect mode error. 4) Uploads only to the exact create-asset uploadUrl; connect-src allows only that bucket path. 5) No unsafe-inline; style attributes blocked. 6) cmsLocaleId on every CMS write; localized sites are not written (listing says so).
```

**Additional notes** (form limit 5000 characters; this is 4979). The form's WAF blocks angle brackets, key-equals-value pairs, DOM API names, `\u00a0` and `/*` — the block below avoids them, paste as is:

```
WHAT CHANGED (bundle v0.1.0, 09-17_19-58-15) - 1 to 6 answer the 2026-09-17 feedback in order; 7 and 8 the Preflight scans

1. Workspace state. The effect that posted the single workspace to /api/v1/beacon/active-workspace on sync completion is removed. A user with one workspace and none active sees it as a suggestion with an explicit "Use this workspace" control; the only request to that endpoint comes from that click or the multi-workspace picker. The server changed too: an extension session without a chosen workspace stays without one (no default from memberships, nothing written) until the user confirms. Unit tests pin zero requests after sync, one after the click, and no server fallback for extension sessions.

2. Exception telemetry. The Marketplace build ships no telemetry SDK: the dependency sits behind a build-time release flag that is off for Marketplace bundles; the release build fails if it is on and verifies the zip has no trace of it (no analytics chunk, no telemetry host in connect-src, no consent prompt). Settings and the privacy policy say so. Builds that enable telemetry run a redaction handler on every event (URLs, referrers, titles, e-mail, tokens, query strings, exception text), unit-tested with synthetic sensitive values.

3. Redirects. The single network call site (extension-egress.ts) runs every request with redirect mode set to error; callers cannot override it. No path needs a redirect: Tower answers its API routes directly and the presigned S3 upload returns a 2xx with no redirect field.

4. Upload allowlist. The create-asset adapter registers the exact uploadUrl string Webflow returned as a one-shot permitted destination, only if it is HTTPS on host exactly s3.amazonaws.com with first path segment exactly webflow-prod-assets. The egress policy accepts an upload only for a granted URL and consumes the grant; other keys, buckets, S3 host variants and Webflow-owned hosts are refused before any request. connect-src names the bucket path, not the host: self, https://tower.codalyn.app, https://s3.amazonaws.com/webflow-prod-assets (the documented uploadUrl, exact) and that path as a prefix; any other bucket is blocked by the browser. Webflow asset hosts stay in img-src only.

5. CSP style directives. unsafe-inline is removed: style-src and style-src-elem allow self plus the hosted bundle host; style-src-attr is none. The UI sets styles through the CSSOM, which CSP does not govern. The two style-attribute writes left in the bundle are pinned by count in the release build; both are Designer API calls styling the CMS Slots placeholder on the user's canvas element, outside the extension's policy. All UI stories render clean under the enforced policy.

6. Localization. Every CMS item write names its locale: the extension reads the site's locales (Get Site) once per session and sends the primary locale's cmsLocaleId on every write (image editor field update; CMS Slots layout save, staged and live) and on the matching staged read. Sites with secondary locales are not written: the write is refused before any request with an in-app message. The listing states this.

7. Rich text editing. The rich-text property editor is withdrawn behind a release flag like item 2; its Lexical editor observed its own editable element inside our panel, never the canvas, which the bundle scan reported as a silent canvas mutation. Rich-text properties are edited as HTML in a text box; the bundle has no observer construction and no editable-content element.

8. Browser storage and cookies. The session bearer is held in memory only; no storage call in the bundle is keyed by a credential name. Every request sets the cookie mode to omit at the single call site, so no cookie is sent or stored; the only credential on the wire is our Tower session bearer, sent only to tower.codalyn.app. The release build forbids both shapes.

UNCHANGED FROM 2026-09-15: one network call site with an explicit destination policy (release build fails on a second); canvas changes only through the Designer API on explicit user action; Tower with allowlist-only CORS, session-only auth, server-stored OAuth state, the Webflow ID token never forwarded; no plaintext-HTTP or insecure-websocket URLs, no HTML-injection sinks, no popups or cross-window messaging, no credentials in URLs, no session replay; styles.css ships a v3 source map.

PUBLISHED-RUNTIME TEST: Beacon applies one page-level script, registered with a SHA-256 integrityHash and carried verbatim in the page tag with anonymous crossorigin (20153 bytes, SHA-256 6f3be0f588c2045a90034555b0375cb082b40d42b94520a2f6679f1ed55795d3). It is served unminified, so it is its own source. Every other script on the test page is Webflow's own site runtime; Beacon loads none.

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

Release flags unset = the Marketplace state (no telemetry SDK, no rich-text editor, localized-site CMS writes blocked). A new zip means: new hashes here, new Preflight scan, new receipt, re-install on beacon-demo, re-run Step 3.
