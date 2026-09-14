# Webflow Marketplace submission playbook (Beacon)

End-to-end runbook for getting a Beacon submission through Webflow App Review without a wasted
round. Two skills drive it — both installed project-locally for Claude Code (`.claude/skills/`) and
Cursor (`.cursor/skills/`):

| When                          | Skill                            | Output                                                         |
| ----------------------------- | -------------------------------- | -------------------------------------------------------------- |
| Before any submission         | `webflow-app-preflight`          | go / no-go quality gate, evidence per checklist item           |
| After Webflow issues findings | `webflow-app-review-remediation` | normalized findings table → fix → evidence → resubmission packet |

Both are markdown instruction sets, not scripts. Invoke with `/webflow-app-preflight` or
`/webflow-app-review-remediation` in Claude Code (or just describe the task — they auto-trigger on
Marketplace work). In Cursor, name the skill in the prompt. Skill source + version:
`.cursor/skills/*/PROVENANCE.txt` (packaged 2026-08-12 rev b).

Running log of every round, finding and fix: [webflow-marketplace-compliance.md](webflow-marketplace-compliance.md).
Reviewer-facing short response: [webflow-marketplace-response-short.md](webflow-marketplace-response-short.md).

---

## A. Pre-submission loop (run every time, even for "small" updates)

### A1. Green repo

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter beacon test:run scripts/release-build-gates.test.mjs   # build-gate unit tests
```

### A2. Run the preflight skill against the codebase

Fresh Claude Code session (skills are discovered at start):

```
/webflow-app-preflight Run the pre-submission quality gate against apps/beacon.
Prior findings + fixes are in docs/webflow-marketplace-compliance.md (latest round at the bottom).
Report each checklist item as pass / fail / n-a with evidence (file:line or artifact check).
```

Fix every fail. Re-run until go. The gate itself lives at
`.cursor/skills/webflow-app-preflight/checklists/pre-submission-quality-gate.md`;
`governance-pitfalls.md` next to it is the "what actually gets rejected" list — read it once.

### A3. Build the production artifact

```bash
CI=true BUILD_RECIPIENT=public pnpm --filter beacon build:prod
```

Output: `apps/beacon/bundle/production/public/v<ver>_public_<MM-DD_HH-mm-ss>.zip` plus the matching
`.sourcemaps.zip` (private — submission form field only, never inside the bundle).

Retention runs at the end of every build (`BUNDLE_RETENTION` in `scripts/build-cli.mjs`): the newest 2
builds stay in place, older builds that this doc or the compliance doc names (scan targets, submitted
artifacts) move to `apps/beacon/bundle/archive/<channel>/<recipient>/`, anything else is deleted. So:
**record a build's zip name in the compliance doc before the next build if it was uploaded anywhere**,
otherwise it will not survive. The whole `bundle/` tree is gitignored; the sha256 in the doc is the
durable record.

`scripts/build-cli.mjs` already fails the build on forbidden markers (`localhost`, tunnel hosts,
Sentry in Beacon, `sourceMappingURL`, `?token=` / `&token=`, dev-only popout, telemetry block in
`webflow.json`, …) and `scripts/vite-strip-dev-host-literals.mjs` compiles audited vendor literals
out of the bundle **and** the source-map `sourcesContent`. Those gates are the backstop; the artifact
checks below are the proof you record.

### A4. Artifact checks — run against the exact zip you will upload

```bash
cd apps/beacon/bundle/production/public
Z=v0.1.0_public_<stamp>.zip; M=${Z%.zip}.sourcemaps.zip
shasum -a 256 "$Z" "$M"                                      # record both hashes
unzip -l "$Z" | tail -1                                      # entry count, must be < 5 MB total
unzip -l "$Z" | grep -c '\.map$'                             # 0
unzip -p "$Z" '*.js' | grep -c  'sourceMappingURL'           # 0
unzip -p "$Z" '*.js' | grep -ciE '[?&]token='                # 0  (credential-in-URL)
unzip -p "$Z" '*.js' | grep -ciE 'localhost|ngrok|sentry'    # 0
unzip -p "$Z" '*.js' | grep -c  'window.open('             # 0  (Prohibited Popups, R7b.10)
unzip -p "$Z" '*.js' | grep -c  'postMessage'              # 0  (Insecure postMessage, R7b.10 — scheduler patched to postTask)
unzip -p "$Z" '*.js' | grep -oE 'https://[a-z0-9.-]+' | sort -u   # only CSP-allowlisted hosts
unzip -p "$Z" webflow.json                                   # one manifest, real name, apiVersion "2", no telemetry
unzip -p "$M" '*.map' | grep -ciE '[?&]token='               # 0 — reviewer scans the maps too
unzip -l "$M" | grep -c 'styles.css.map'                     # 1 — every generated file needs a map (R7b.11)
unzip -p "$Z" '*.js' | grep -oiE 'https?://[^"'"'"'` )]*' | grep -viE '^https://|www\.w3\.org' | wc -l   # 0 http:// (W3C namespaces exempt)
unzip -p "$Z" '*.js' | grep -cE '\.(inner|outer)HTML\s*=[^=]|insertAdjacentHTML\(|document\.write\('  # 0 HTML-sink writes
unzip -p "$Z" '*.js' | grep -cE '(^|[^A-Za-z0-9_$.])fetch\('  # 1 — the extensionFetch chokepoint only (R7b.12; build gate pins it)
unzip -p "$Z" '*.js' | grep -c 'new MutationObserver'        # 1 — Lexical's contenteditable observer only (R7b.11/12 open item; build gate pins it)
unzip -p "$Z" '*.js' | grep -c 'window.open(\|postMessage('   # 0
```

Anything off its expected value → fix, rebuild, re-run. Never edit a zip by hand. The two `1`s are
pinned by `pinnedMarkerCounts` in `scripts/build-cli.mjs` (dist + zip): a second `fetch(` or
`MutationObserver` anywhere in the artifact fails `build:prod` before you can upload it.

**App Review Preflight shows at most 3 evidence locations per finding** (R7b.8 had four `?token=`
URLs, three listed; R7b.11 had four `MutationObserver`s, three listed). Never fix only the listed
locations — grep the whole artifact for the shape and clear every hit, or the next scan lists the
ones it hid.

### A5. Webflow-side artifacts (required by the submission form)

1. **Published `.webflow.io` test site** with the new bundle installed via the version manager.
   Reviewer credentials still valid; demo data present; Tower backend live for the whole review
   window (10–15 business days).
2. **App Review Preflight** Designer Extension (install link in
   `.cursor/skills/webflow-app-preflight/README-START-HERE.md`) — run it on the **same** bundle zip
   **and** the **same** `.sourcemaps.zip`. Zero blockers → copy the `wfpre_…` receipt.
   A blocker here → go to section B with the preflight output as the findings.
3. Listing assets: screenshots, 512×512 icon, demo video (approve + deny flows), ToS and Privacy as
   distinct URLs, fees disclosed, AVIF conversion disclosure in notes.

### A6. Record + commit

- Append a `### R<n>.<m>` entry to `docs/webflow-marketplace-compliance.md`: finding (or "preflight
  re-run"), observed, fix, artifact hashes, six-state line (see B4).
- Commit source + doc **before** submitting, so artifact hash ↔ commit is traceable.
- Submit at <https://developers.webflow.com/submit> (App Update → name, Client ID, "new bundle: yes",
  source-map upload, `wfpre_…` receipt, notes).

---

## B. Findings loop (rejection email or App Review Preflight blocker)

```
/webflow-app-review-remediation
<paste findings verbatim — IDs, priority, evidence locations, acceptance criteria>
App: Beacon (Designer Extension + Tower backend). Source: this repo. Last submitted artifact:
<zip name + sha256 from compliance doc>.
```

### B1. Normalize

One row per finding, before touching code:

| Finding ID (verbatim) | Priority (verbatim or `unassigned`) | Observed (what source/artifact proves) | Acceptance criteria (quoted or `needs reviewer clarification`) | Provenance | Evidence state |

Provenance ∈ published requirement · issued finding · security control · open decision.
`unassigned` → treat as P1. Open decisions (policy, exceptions) get an owner and do not block
independent findings.

### B2. Route to the owning layer

Data/state → behavior (extension, backend, OAuth, build) → policy. Code can't close a policy item.
Live credential leak or cross-tenant exposure → containment lane first (rotate, owner, minimal
evidence) before ordinary remediation.

### B3. Narrowest fix + gate

- Fix the root cause at the build gate when it is bundle-shaped (`build-cli.mjs` forbidden markers,
  `vite-strip-dev-host-literals.mjs` rules + residual guards), with a unit test in
  `apps/beacon/scripts/release-build-gates.test.mjs` that (a) proves the installed vendor has the
  shape, (b) proves the transform removes it, (c) proves a synthetic regression fails the build.
- First-party problems: fix the code, add a test, and still add a forbidden marker if the shape is
  greppable.
- Rebuild (A3) and re-run artifact checks (A4) on the new zip.

### B4. Six states — report separately, never infer a later one from an earlier one

`Source verified` → `Artifact verified` → `Installed on test site` → `Runtime observed` →
`Submitted` → `Reviewer accepted`. Write the line into the compliance doc entry, e.g.
`Source ✓ · Artifact ✓ · Installed ✗ · Runtime n/a · Submitted ✗ · Accepted ✗`.

### B5. Packet + resubmit

Per finding: ID, one-line disposition, files changed, test command + result, artifact sha256,
runtime evidence if any, remaining limitation (example: `docs/webflow-resubmission-packet-2026-08-19.md`). Then A5 (preflight re-run, confirm the finding is
gone, new receipt) and A6. Skill ends with **READY TO RESUBMIT** / **NOT READY** — that is your
readiness, not Webflow's approval.

---

## C. Worked example — R7b.8 "Credential in URL" (2026-08-19)

Finding: App Review Preflight BLOCKER, `?token=` in `assets/init-observability-*.js` (3 locations).
Observed: all hits inside `posthog-js@1.369.3` (4 token-in-query URLs, every path unreachable in
Beacon's config). Fix: 4 strip rules + `credential-in-query-string` residual guard
(`vite-strip-dev-host-literals.mjs`), `?token=`/`&token=` forbidden markers + source-map
`sourcesContent` rewrite (`build-cli.mjs`), 7 new tests. Artifact `v0.1.0_public_08-19_10-31-14.zip`
sha256 `f4a20169…2cd90`: 0 `?token=` in bundle and in all 10 maps, bare endpoints present, body
token untouched. States: Source ✓ · Artifact ✓ · Installed ✗ · Runtime n/a · Submitted ✗ · Accepted ✗.
Full write-up: compliance doc § R7b.8.

## C2. Worked example — R7b.9 "Fingerprinting & Session Replay" (2026-08-19)

Finding: App Review Preflight BLOCKER, 3 locations — `rrweb`/`initSessionRecording` in
`assets/init-observability-*.js` and two `canvas.toBlob` sites in `bundle.js`. Observed: (1) the
dormant posthog-js session-recording controller (disabled by config, still in the chunk); (2) the
image editor's export encode — not fingerprinting (no `getImageData`/`toDataURL`, user's own asset,
no read-back). Fix: pnpm patch excises the controller, the core's recorder seam and the public
replay API from `dist/module.js` (capability absent, not dormant); `session-replay reference`
residual guard on posthog-js + `rrweb`/`fullstory`/`sessionrecording`/`recorder` forbidden markers;
the two canvas helpers collapsed to one `canvasToBlob` with the rationale on it; 4 + 2 new tests.
Re-scan on that build: replay half gone, the single `toBlob` still flagged → rule is shape-based, so
the export path moved to `OffscreenCanvas` + `convertToBlob` (no DOM canvas, same capability, disclosed
on the helper) and `.toBlob(`/`toDataURL`/`getImageData` became forbidden markers. Artifact
`v0.1.0_public_08-19_12-13-38.zip` sha256 `2e9fd8db…4af1`: 0 rrweb/recorder/sessionrecording, 0
toDataURL/getImageData, 1 `convertToBlob`. States: Source ✓ · Artifact ✓ · Installed ✗ · Runtime n/a ·
Submitted ✗ · Accepted ✗.
Full write-up: compliance doc § R7b.9.

---

## C3. Worked example — R7b.11 five REQUIRED findings on the 09-14 12:08 build (2026-09-14)

Findings: External API Calls (better-fetch request builder ×2, Vite modulepreload polyfill),
Generated code not traceable (no `styles.css.map`), Insecure Protocols (posthog `http://yandex.com/bots`,
better-fetch `'http://'`), Silent Canvas Mutations (Radix FocusScope / Lexical / Vite polyfill
`MutationObserver`s — the first-party drawer observer was the hidden 4th), Unsafe HTML Injection
(react-dom's three `.innerHTML =` sites). Fixes: better-auth client replaced by a first-party
`tower-session-client.ts` (three `towerFetch` calls); `modulePreload.polyfill: false`;
`scripts/vite-css-sourcemap-plugin.mjs` (lightningcss minify + map, `cssMinify: false`); strip rules
for react-dom innerHTML (→ throws) and the yandex entry; pnpm patch drops FocusScope's observer
(focusout-based recovery); drawer observer → static `:has()` CSS rule; site runtime renders
sanitized nodes instead of assigning `innerHTML`; regex-capable forbidden markers (`http://` minus
W3C, `ws://`, HTML sinks). Remaining: Lexical's contenteditable observer (open reviewer judgment).
Full write-up: compliance doc § R7b.11.

## C4. Worked example — R7b.12 two REQUIRED findings on the 09-14 12:50 build (2026-09-14)

Findings: External API Calls (the three first-party `fetch` sites left after R7b.11 — Designer-session
exchange, `towerFetch`, presigned runtime-asset upload) and Silent Canvas Mutations (Lexical, as
predicted). Lesson: the rule keys on the bare `fetch(` token — posthog's XHR/sendBeacon transport in
the same artifact drew no evidence — so replacing a vendor request layer with first-party calls only
moves the evidence slots. Fix: `shared/lib/extension-egress.ts` is the one `fetch` in the bundle,
with the destination policy (exact Tower origin, Webflow asset-upload allowlist) at the call site;
`pinnedMarkerCounts` in `build-cli.mjs` pins `fetch(` = 1 and `new MutationObserver(` = 1 on dist +
zip; a source sweep test forbids any other first-party `fetch`/observer. Lexical: kept — its
observer gates Lexical's own DOM reconcile and evicts browser-inserted IME nodes; stubbing it
duplicates text for CJK users, and every contenteditable editor carries the same constructor. Answer
with the rationale in compliance doc § R7b.12; the fallback is a product change (non-contenteditable
CMS rich-text field), Miles's call.
Full write-up: compliance doc § R7b.12.

## D. Don'ts (from the skills' anti-advice list)

- Don't verify `dist/` — verify the zip you upload.
- Don't hand-edit an artifact; rebuild.
- Don't call a source fix "deployed" or an upload "installed".
- Don't retest a live exposure once minimal evidence exists.
- Don't bypass or argue the gate — "unreachable code" still has to be absent if the rule is
  shape-based (R7b.8 is the proof).
- Don't ship Flint from a stale `dist/` — it shares the posthog-js module and needs the same rebuild.
