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

## Reference Docs

- [Agent Teams guide](docs/agent-teams.md) — how to spin up effective Claude Code agent teams (enable flag, teams vs subagents, spawn templates, monorepo patterns).
- [Storybook guide](docs/storybook.md) — Beacon UI catalog for designers (runs without the Webflow Designer runtime); story conventions and architecture rationale.
