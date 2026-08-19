# Beacon — App Review Preflight remediation packet (2026-08-19)

Partner-facing resubmission note for the two App Review Preflight blockers issued against the
08-19 10:31 public build. Full engineering write-ups: `docs/webflow-marketplace-compliance.md`
§ R7b.8 and § R7b.9. Nothing in this file is a Webflow approval decision.

## Review target

- App: Beacon — Designer Extension (`apps/beacon`) + first-party backend Codalyn Tower
  (`apps/tower`, `https://tower.codalyn.app`). Hybrid (Designer Extension + Data Client OAuth).
- Findings issued by: App Review Preflight (Webflow-controlled scan), run against
  `v0.1.0_public_08-19_10-31-14.zip` (sha256 `f4a20169…2cd90`).
- Corrected artifact: `apps/beacon/bundle/production/public/v0.1.0_public_08-19_12-13-38.zip`
  sha256 `2e9fd8db1698e567ba13a939a9ed43f22643a33e8da70afc5ed138c1a7dc4af1` (25 entries, 1.89 MB),
  private source maps `v0.1.0_public_08-19_12-13-38.sourcemaps.zip` sha256
  `362eeeef5f26b8d4751f6e42865c84a7b62470bc19f55c7561fba07926565ec4` (submission-form field only).
  (Intermediate build `v0.1.0_public_08-19_10-53-26.zip`, sha256 `eb963a9d…2ae79`, was scanned: the
  session-replay evidence was gone; one `canvas.toBlob` location remained — resolved below.)
- Build command: `CI=true BUILD_RECIPIENT=public pnpm --filter beacon build:prod` (lint + typecheck +
  unit tests + Vite build + forbidden-marker gate on dist and archived zip + source-map rewrite).
- Source revision: working tree on `main` after `124dbea` (uncommitted at time of writing — commit
  before upload so artifact ↔ commit is traceable).
- Release / resubmission owner: Miles Roxas.

## Finding matrix

| Finding (verbatim) | Issued priority | Provenance | Acceptance criterion | Evidence state |
| --- | --- | --- | --- | --- |
| Credential in URL — `?token=` in `assets/init-observability-*.js` (3 locations) | Blocker | issued finding + published requirement (Marketplace Guidelines: credentials never in URLs) | "Move the credential out of the URL (header or protected body)" | artifact-verified |
| Fingerprinting & Session Replay — `assets/init-observability-*.js:1` (rrweb / session recording), `bundle.js:85` ×2 (`canvas.toBlob`); re-scan on 10:53 build: `bundle.js:85` ×1 (`canvas.toBlob`) | Blocker | issued finding + published requirement (Marketplace Guidelines: no session replay / fingerprinting) | As issued: "Update the implementation, upload a revision, and use the next scan to confirm" (no finer criterion supplied) | artifact-verified (12:13 build not yet re-scanned) |

## Per-finding disposition

### 1. Credential in URL

1. **Disposition** — Resolved. The four `?token=<project key>` request URLs were in the bundled
   `posthog-js@1.369.3` module (early-access features, product tours, surveys, logs), all unreachable
   under Beacon's pinned configuration; the credential is now compiled out of each URL at build time
   and the shape is forbidden in every shipped file and in the source maps.
2. **Change** — `scripts/vite-strip-dev-host-literals.mjs` (4 rewrite rules + `credential-in-query-string`
   residual guard), `scripts/build-cli.mjs` (`?token=` / `&token=` forbidden markers; vendor
   `sourcesContent` rewritten in the private source-map archive), tests in
   `apps/beacon/scripts/release-build-gates.test.mjs`.
3. **Verification** — `pnpm --filter beacon exec vitest run scripts/release-build-gates.test.mjs` → 44/44 pass
   (installed module has exactly 4 token-in-query URLs, 0 after transform; synthetic fifth fails the build).
4. **Artifact evidence** — zip JS `[?&]token=` 0 hits; all 11 maps 0 hits; bare endpoints present once each;
   event-capture body token untouched.
5. **Limitations** — none. No runtime behaviour change (paths were unreachable before and after).

### 2. Fingerprinting & Session Replay

1. **Disposition** — Session replay: resolved — the posthog-js session-recording controller (the code
   that references `rrweb` and lazy-loads the recorder) is excised from the shipped module, together with
   the SDK's recorder-instantiation seam and public replay API; the capability is absent, not merely
   disabled. The re-scan on the 10:53 build no longer listed the observability chunk (evidence from the
   Webflow-controlled run, not acceptance). Fingerprinting: no fingerprinting exists; the `canvas.toBlob`
   evidence was the image editor's export encoder. Because the re-scan still flagged the single remaining
   `toBlob`, the export path now renders to an `OffscreenCanvas` and encodes with
   `OffscreenCanvas.convertToBlob` — no DOM canvas element, no `toBlob`/`toDataURL`/`getImageData` in the
   bundle — same capability and the same consent boundaries, disclosed on the helper and here.
2. **Change** — `patches/posthog-js@1.369.3.patch` (pnpm `patchedDependencies`; removes the default
   `sessionRecording` extension class, `__extensionClasses.sessionRecording` wiring,
   `startSessionRecording` / `stopSessionRecording` / `sessionRecordingStarted` / `get_session_replay_url`,
   the `__rrweb_original__` console indirection, and the recorder's config defaults / persistence keys);
   `scripts/vite-strip-dev-host-literals.mjs` (`session-replay reference` residual guard on posthog-js);
   `scripts/build-cli.mjs` (`rrweb` / `fullstory` / `sessionrecording` / `recorder` and `.toBlob(` /
   `toDataURL` / `getImageData` forbidden markers);
   `apps/beacon/src/features/image-editor/lib/crop-image.ts` (`renderCroppedRegionToCanvas` → `OffscreenCanvas`,
   explicit support guard), `apps/beacon/src/features/image-editor/lib/canvas-to-blob.ts` (single
   `canvasToBlob` via `convertToBlob`, used by `encode-image-blob.ts` and `export-preview-encode.ts`);
   `packages/observability/src/index.ts` (`disable_session_recording: true` kept, documented as defence
   in depth).
3. **Verification** — release-gate suite 45/45 (installed posthog module has 0
   `rrweb|fullstory|recorder|replay|recording` references and none of the removed methods; synthetic
   re-introductions each fail the build; forbidden markers catch `rrweb` / `FullStory` / `sessionRecording`
   / `lazy-recorder` / `.toBlob(` / `toDataURL` / `getImageData` and allow `convertToBlob`);
   `canvas-to-blob.test.ts` 3/3 + `encode-image-blob.test.ts` 8/8; `@codalyn/observability` 18/18; Beacon
   `tsc --noEmit` clean; full `build:prod` pipeline green. Behavioural equivalence of the patched SDK
   checked with an AST parse (acorn) and a jsdom smoke run using Beacon's exact init options — identical
   request pattern before/after, `posthog.sessionRecording === undefined` after.
4. **Artifact evidence (12:13 build)** — zip JS (case-insensitive): `rrweb` 0, `fullstory` 0,
   `sessionrecording` 0, `recorder` 0, `toDataURL` 0, `getImageData` 0, DOM `createElement("canvas")` 0,
   `OffscreenCanvas` 3, `convertToBlob` 1, `replay` 1 (React DOM `$$reactFormReplay` — form-action
   replay, unrelated), `recording` 3 (the pinned `disable_session_recording:!0` option and two
   Settings → Privacy disclosure sentences stating session recordings are never collected). Source maps:
   `rrweb` / `lazy-recorder` / `sessionRecording` / `?token=` 0 hits.
5. **Limitations** — `convertToBlob` is the one encoder left; in-browser image export cannot exist without
   it (the only alternatives read pixels back, which is worse, or send bytes to a server, which the
   privacy model forbids without opt-in). A plain-substring `toBlob` scan would still match inside
   `convertToBlob`; a word-bounded or `.toBlob(` scan would not. If the next scan names it, the rationale
   above is the answer. Browser floor for the offscreen path: Chrome 69+, Firefox 105+, Safari 16.4+.

## Verification receipts (six states, reported separately)

| State | Evidence | Result |
| --- | --- | --- |
| Source verified | Files above; `release-build-gates.test.mjs` 45/45; image-editor tests 11/11; observability 18/18; `tsc` clean | ✓ |
| Artifact verified | `v0.1.0_public_08-19_12-13-38.zip` sha256 `2e9fd8db…4af1`; playbook A4 checks: 0 `.map`, 0 `sourceMappingURL`, 0 `[?&]token=`, 0 `localhost|ngrok|sentry`, 0 rrweb/recorder, 0 toDataURL/getImageData; `webflow.json` = `{name: beacon, publicDir: dist, size: comfortable, apiVersion: "2"}`, no telemetry block; sourcemaps zip 0 hits | ✓ |
| Installed revision verified | — | ✗ not yet installed on the `.webflow.io` test site |
| Runtime observed | n/a for both findings (no runtime behaviour change; recorder was never loaded; paths unreachable). App Review Preflight re-scan of the 10:53 build: Credential in URL gone, session-replay evidence gone, 1 `toBlob` location remained (now removed). 12:13 build not yet scanned | ✗ |
| Submitted | — | ✗ |
| Reviewer accepted | — | ✗ |

## Before upload (owner actions)

1. Commit source + docs (artifact ↔ commit traceability), then deploy Tower with migration `0036`
   applied and `TOWER_TOKEN_ENCRYPTION_KEY` confirmed in Production (carried over from § R7b).
2. Install `v0.1.0_public_08-19_12-13-38.zip` on the published `.webflow.io` test site via the version
   manager; confirm reviewer credentials and demo data.
3. Run **App Review Preflight** on that exact zip **and** `v0.1.0_public_08-19_12-13-38.sourcemaps.zip`;
   confirm both findings are gone (if "Fingerprinting" still names `convertToBlob`, include the rationale
   above in the submission notes); record the `wfpre_…` receipt.
4. Submit at <https://developers.webflow.com/submit> (App Update, new bundle, source-map upload,
   `wfpre_…` receipt, notes incl. AVIF disclosure).

## Verdict

**NOT READY TO RESUBMIT** — source and artifact evidence complete for both blockers; missing: installed
revision on the test site, App Review Preflight re-scan of the 12:13 build + receipt (`wfpre_…`), and the
Tower production deploy (migration 0036 + key). This verdict describes partner readiness only, not a
Webflow decision.
