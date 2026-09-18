# "Script integrity is missing or wrong" — investigation state (last updated 2026-09-18)

Working note for the App Review Preflight runtime-test item that has survived rounds 7b and 8. Nothing here is
blocking the 2026-09-18 submission, which went out with the values in the table below. Open this only if the
submission comes back with this item again. Canonical history: [compliance-record.md](../compliance-record.md)
R7b.17–R7b.19, R8.13, **R8.16 + addendum**.

## The item

> Script integrity is missing or wrong — A page-loaded script does not use the SRI value saved in this test
> package. `6aac8a88596e00b6a2967e15_codalyn-beacon-runtime-9b7da263.js`
> Next step: Add the saved integrity value and `crossorigin="anonymous"` to each script tag. Make sure the CDN
> allows cross-origin SRI.

## State of the published page, 2026-09-18 14:55 UTC (runtime-observed)

`node scripts/webflow-runtime-pin.mjs https://beacon-demo.webflow.io/blog/the-power-of-resilience` → exit 0.

| What | Value |
| --- | --- |
| Tag | `src` · `type="text/javascript"` · `integrity="sha256-SbM4+njh+BNrGrGpg7P3LmGFNsknGBWNaqciq2kkBf0="` · `crossorigin="anonymous"` · `data-codalyn-beacon="runtime"` · `data-codalyn-beacon-src-hash="9b7da263"` |
| URL | `https://cdn.prod.website-files.com/6a35c562c551e2eb11bc4f1c/6aac8a88596e00b6a2967e15_codalyn-beacon-runtime-9b7da263.js` |
| Bytes / SHA-256 | 20 486 · `49b338fa78e1f8136b1ab1a983b3f72e618536c92718158d6aa722ab692405fd` |
| Encodings | identity, gzip, br all decode to the same bytes and the same SHA-256 |
| CDN | `access-control-allow-origin: *` with and without `Origin`; `GET, HEAD`; `application/javascript`, no charset; no redirect |
| Hygiene | 635 lines · 0 non-ASCII bytes · no CR · **no trailing newline** · last line is the map pointer |
| Source map | v3, 24 786 B, `sourcesContent[0]` == served file minus its last line |
| Runtime behaviour | never touches its own script element (reads `document.currentScript.src` only) |
| Page HTML | byte-identical (same sha256) when fetched with Chrome UA + navigation headers as with plain curl |

## Falsified causes — do not re-test

| Cause | Ruled out by |
| --- | --- |
| `/` or `+` in the base64 pin | R7b.18 → R7b.19 (slash-free pin, same item) |
| Non-ASCII bytes / charset-sensitive decode | R7b.19 (runtime made pure ASCII, same item) |
| Trailing newline / body-trimming consumer | R8.13 → this round (file ends at the map URL, same item) |
| Missing `integrity` or `crossorigin` on the tag | Served HTML, every round |
| CDN not allowing cross-origin SRI | ACAO `*`, verified with and without `Origin` |
| Browser actually blocking the script | Ready selector resolves; Preflight's own row says Loaded ✓ · Hash matched ✓ |
| Stale test package (superseded URL/SRI) | R8.16 addendum — the saved package holds the live URL, SHA-256 and SRI |

## The one app-side variable left: tag shape

Every tag on the test page that Preflight does **not** flag ends at `crossorigin="anonymous">`. Ours continues
with two `data-*` attributes, because `syncCmsSlotPageInlineScript` puts them in the page custom-code entry's
`attributes`. A matcher anchored on the end of the tag, or one reading a fixed attribute set, fails on exactly
our tag and nothing else on the page.

### Step 1 — discriminating run, no code change, no risk

Re-run the runtime test with Webflow's jQuery tag added as a second pinned runtime file (control: clean tag
shape, correct sha256 pin, verified verbatim in its tag). Diagnostic run only — the submission run keeps
"More runtime files" empty (R7b.16).

```
URL     https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=6a35c562c551e2eb11bc4f1c
SHA-256 f7f6a5894f1d19ddad6fa392b2ece2c5e578cbf7da4ea805b6885eb6985b6e3d
SRI     sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=
```

Refresh these with `node scripts/webflow-runtime-pin.mjs <page url> --all` — they change on every site publish.

- **Control ✓ / Beacon ✗** → the `data-*` attributes are the differentiator. Go to step 2.
- **Control ✗ / Beacon ✗** → the check fails on a Webflow-authored pin too. That is the evidence for the
  reviewer; no app change resolves it. (Caveat: the control's base64 carries `/` where ours carries `+`.)
- Do **not** change runtime bytes again in either branch. Before anything else, expand "Evidence artifact
  details" on the failing run and download all 8 artifacts — they show what the tool compared.

### Step 2 — drop the `data-*` attributes (only if the control passes)

Goal: Webflow renders `<script src type integrity crossorigin>` for us too, **without** minting a new asset or a
new registration — so the URL, the bytes, the SRI and the saved Preflight package all stay valid, and the change
is a clean A/B against the failing run.

All in `apps/beacon/src/features/cms-slots/model/cms-slot-page-inline-script.ts`:

1. Identify our page entries without any DOM-visible marker. The registered version already carries the source
   hash (`cmsSlotRuntimeScriptVersion` → `<semver>+beacon.<hash>[.n]`), and page custom-code entries expose
   `version`. Add `readBeaconRuntimeHashFromVersion(version)` (`/\+beacon\.([0-9a-f]{8})(?:\.\d+)?$/`).
2. `isBeaconRuntimeScript`: registered id **or** version hash **or** the legacy marker attribute (back-compat
   for pages synced by earlier builds). `withoutAnyBeaconRuntimeScripts` / `mergePageScriptsWithBeaconRuntime`
   filter through that same predicate, preserving the exactly-one-runtime invariant.
3. `decideCmsSlotRuntimeSyncAction`: read the applied hash from the version, falling back to the legacy
   attribute; add a third action `reapply` for "hash matches but the entry still carries attributes".
4. `syncCmsSlotPageInlineScript`: on `reapply`, PUT the page scripts with the same `{id, version, location}`
   and no `attributes` — no upload, no `registered_scripts/hosted` POST, no purge. On `register`, apply the new
   entry with no `attributes`.
5. `getCmsSlotPageRuntimeSyncStatus`: match the footer entry by the same predicate and compare the version hash.
6. Tests (both suites already cover the marker paths and must move with it): legacy-attribute page migrates via
   `reapply` with zero uploads and zero registrations; applied entry ends with no attributes; version-hash
   parsing incl. the `.n` suffix and garbage; unchanged build still skips; duplicate/foreign entries still
   collapse to one runtime.

After shipping it: install, Sync (expect **no** new asset — same URL and SRI), publish, re-run the pin script
with `--expect-url/--expect-sha256/--expect-sri` (all three must still match the saved package), then re-run the
Preflight runtime test with the package untouched.

## Tooling added this round

`scripts/webflow-runtime-pin.mjs --expect-url= --expect-sha256= --expect-sri=` — compares whatever the Preflight
package currently holds against the live page; exit 1 names the superseded value. Use it before every runtime
test run: a forced Sync mints a new asset id for byte-identical content, so a package can go stale without the
runtime changing.
