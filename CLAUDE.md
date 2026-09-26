# Runtime Value-Shape Safety Rule

Prevent bugs caused by assuming a single runtime data shape from external systems (APIs, SDKs, browser/platform objects, storage, third-party libraries).

## Core Principle

At integration boundaries, treat incoming values as runtime unions, not as a single static type shape.

## Required Practices

- Normalize external values before business logic uses them.
- Accept common equivalent forms when semantically identical, for example:
  - primitive form (`"2560"`)
  - wrapped form (`{ value: "2560" }`, `{ sourceType: "...", value: "2560" }`)
- Parse only after normalization.
- If a paired input is required (e.g., width + height), require both valid values or treat as missing.
- Match entities by stable identifiers (IDs/keys), never display labels or presentation text.
- Keep boundary adaptation separate from domain logic:
  - integration/adaptor layer: fetch + normalize + validate shape
  - domain/resolver layer: pure logic on normalized inputs only

## Validation Rules

- Do not partially apply malformed input.
- Do not silently invent fallback values inside boundary normalization unless explicitly required.
- For invalid/missing boundary data, return explicit null/none/error state and let caller decide behavior.

## Testing Requirements

Every boundary parser/normalizer must include tests for:

- canonical shape
- alternate equivalent shape(s)
- missing fields
- malformed fields (wrong type, empty, decimal where int required, zero/negative when positive required)
- identifier-vs-label matching (ID works, label-only path rejected)

## Recommended Helper Pattern

Use shared helpers instead of ad hoc per-call parsing:

- `readStringLikeValue(raw): string | null`
- `parsePositiveIntegerString(raw): number | null`
- `parseRequiredPair(a, b): Pair | null`

## Explicit Application to Webflow (and similar SDKs)

When reading Webflow Designer API values (or any SDK returning rich value objects):

- always normalize `prop.value` from both primitive and wrapped object shapes
- use `propId`/stable IDs for matching
- never rely on `display.label` for logic

## PR Checklist Item

- [ ] Boundary values are normalized before use.
- [ ] Logic matches by stable IDs, not labels.
- [ ] Tests cover canonical + alternate runtime shapes.
- [ ] Invalid/partial boundary data does not get partially applied.

## UI Styling Ownership Rule

- Do not style shared components at call sites.
- When a visual change is needed, update or extend variants/component APIs at the owning primitive (for example under `shared/ui`) and consume that API.
- Only allow call-site overrides when absolutely necessary for non-visual layout placement constraints; keep them minimal.
- Treat call-site visual styling as a DRY and single-source-of-truth violation.

## Storybook Coverage Rule (Beacon)

Every new or visually changed UI component in `apps/beacon` MUST ship with a Storybook story in the same change. No UI PR without its story.

- Presentational components (plain props, no app context): plain-prop story. Titles: `UI/<PascalCase>` for `shared/ui`, `CmsSlots/<Name>` / `ImageEditor/<Name>` / feature-name for feature ui dirs.
- Screens / context-heavy components: smoke story via `beaconScreen(persona, opts)` harness (title `App/<Screen>`, layout fullscreen).
- Exempt: non-visual modules in ui dirs (context providers, gates, prefetchers, pure logic wrappers). If exempt, say so in the PR.
- Changing a component's variants/props: update its existing story to cover the new surface.
- Conventions and rationale: [Storybook guide](docs/storybook.md); exemplar `apps/beacon/src/shared/ui/button.stories.tsx`.

PR checklist:

- [ ] New/changed UI has a new/updated story (or an explicit exemption note).

## Beacon Network Egress & Scanner-Shape Rule

Webflow's Marketplace review scans the compiled bundle statically; bundled vendor code counts as ours and reachability is not a defense.

- All Beacon network calls go through `extensionFetch` (`apps/beacon/src/shared/lib/extension-egress.ts`), Tower calls through `towerFetch`. Never add a direct `fetch` call; add destinations to the egress policy (and the CSP) instead.
- Never introduce these shapes in Beacon source, comments, or new dependencies: `new MutationObserver(`, `window.open(`, `postMessage(`, `innerHTML`/`outerHTML` writes, `insertAdjacentHTML(`, `document.write(`, `http://`/`ws://` URLs, `?token=`/`&token=`, `.toBlob(`/`toDataURL`/`getImageData`, session-replay references, Sentry, dev hosts. The release build pins/forbids each of them on dist and zip (`scripts/build-cli.mjs`).
- A vendor library that carries one of these gets a pnpm patch under `/patches` or a strip rule in `scripts/vite-strip-dev-host-literals.mjs` with a residual guard and a gate test — not a call-site workaround, not obfuscation.
- Canvas mutations are user-initiated only. No timers, observers or loops writing to the Designer.
- Every accepted exception (today: Lexical's contenteditable observer) is recorded with rationale in `docs/webflow-marketplace/compliance-record.md` and pinned by count in the build.

PR checklist:

- [ ] No new `fetch` call outside the egress module; no new scanner-shaped token (see list).
- [ ] New dependency audited for the same shapes before it is added.

## Build Distribution Lane Rule (internal vs public)

`bundle/production/public/` is the Webflow Marketplace lane. The only artifacts allowed in it are the `.zip` + `.sourcemaps.zip` pair built for an actual App Review submission. Every internal review, beta, demo or smoke-test build goes to another recipient folder — `bundle/<channel>/internal/` by default.

Both folders hold identically shaped `v<ver>_<recipient>_<stamp>.zip` names, and the submission form and the Workspace *Publish new version* dialog both take a file path, so a dev-intent artifact in the public folder is one click away from being submitted.

- Build a submission artifact with the purpose named: `pnpm --filter beacon build:marketplace` (or `BUILD_PURPOSE=marketplace`). That is the only way anything reaches the public folder.
- Build everything else with `build:prod` / `build:preview` / `build:dev`; the recipient defaults to `internal`.
- Never pass `BUILD_RECIPIENT=public`, never hand-copy or rename a zip into the public folder, and never create a `public` folder under the preview or development channel.
- The purpose is explicit, never inferred: `scripts/build-cli.mjs` fails the build (before lint) when the purpose and the target disagree, and the guards are unit-tested in `apps/beacon/scripts/release-build-gates.test.mjs`.
- Both files travel together. A build's `.sourcemaps.zip` is private submission-form input — it belongs in the same lane as its zip and nowhere else.

PR checklist:

- [ ] Any new build path names its purpose; nothing writes to `public/` except a Marketplace submission build.

## Reference Docs

- [Agent Teams guide](docs/agent-teams.md) — how to spin up effective Claude Code agent teams (enable flag, teams vs subagents, spawn templates, monorepo patterns).
- [Storybook guide](docs/storybook.md) — Beacon UI catalog for designers (runs without the Webflow Designer runtime); story conventions and architecture rationale.
- [Webflow submission playbook](docs/webflow-marketplace/playbook.md) — end-to-end Marketplace submission runbook: `/webflow-app-preflight` gate → `build:prod` → artifact greps → App Review Preflight receipt → submit; `/webflow-app-review-remediation` loop for findings. Skills live in `.claude/skills/` + `.cursor/skills/`.
- [Webflow review paste sheet](docs/webflow-marketplace/SUBMIT.md) — the only file to open when responding to Webflow: one heading per form field, current round only; update it whenever a new production artifact is built (paths + hashes + "what changed"), move the replaced response body to `docs/webflow-marketplace/history/responses.md`.
- [Webflow Marketplace compliance record](docs/webflow-marketplace/compliance-record.md) — every review round and App Review Preflight finding with observed behaviour, fix, tests, artifact sha256 and the six-state line; check the latest `R<n>` entry before touching networking, DOM, popups, telemetry or the manifest.
