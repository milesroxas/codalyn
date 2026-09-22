# RFC 0001 — TypeSafe judgment engine as Flint's primary lint engine (feature-flagged)

Status: proposed · Date: 2026-09-18 · Scope: `apps/flint`, `apps/tower`, `packages/webflow-kit`, `scripts/build-cli.mjs`

## Summary

Add a second lint engine to Flint that uses TypeSafe's System One model (Jev) for the
judgments a regex cannot make — is this class name meaningful, does it match the
element it sits on, is it a third-party class, which role does this element play,
which candidate rename is best — and make that engine the primary one when a layered
feature flag resolves on.

The shape, in one paragraph: Flint builds small, content-free "class units" from the
`LintContext` it already computes, sends them to a new authenticated Tower endpoint
(`POST /api/v1/flint/ai-lint`), Tower asks TypeSafe a fixed, server-owned set of typed
questions per unit and returns normalized raw judgments, and Flint maps judgments to
ordinary `RuleResult`s through registered, configurable judgment rules. Deterministic
rules keep running locally as the engine's exact-check stage and as the fallback for
every failure mode. The TypeSafe key never leaves Tower; the Flint bundle gains no new
network destination.

Non-goals: generating class names or any free text, writing to the canvas without a
click, sending page copy / CMS content / site or user identifiers to TypeSafe, changing
the free tier (it stays fully offline), replacing exact checks with model calls.

## Motivation

Flint's rules today are grammar- and regex-driven. They verify *format*
(`hero_wrap` parses as Lumos) but not *meaning* (`div-block-23-copy`, `blue-thing`,
`card_title` on a wrapper with forty children, `button` on a paragraph). Role detection
is a scored heuristic with a threshold and an `unknown` fallback, and structural rules
are only as good as those roles. Third-party classes are handled by a static list.

These are common-sense judgments over short text plus structure, which is exactly what
System One is priced and shaped for: typed answers with probabilities, ~100 ms typical
latency, $0.042 per million input tokens, output free, parallel questions over one
state. They are also judgments where Jev's documented weaknesses do not bite, provided
we keep counting, character-level format checks, numeric comparison and text generation
in code (see "What stays in code").

## Detailed Design

### 1. What "primary" means

With the flag on, the TypeSafe engine owns the lint run. It is a composition, not a
replacement:

| Stage | Owner | Why |
| --- | --- | --- |
| Exact checks: naming format, class order, duplicate properties, utility duplication, page structure counts | Existing deterministic runner, unchanged, local | Code is exact, free, offline and instant. Jev's jaggedness notes say it does not count characters or list items reliably and should not compute what code can determine. |
| Candidate generation: rename candidates, role candidates, units | Flint pure domain code | "Select instead of generate": the model cannot pick a value we did not offer, and it is not a text generator. |
| Semantic judgments | TypeSafe via Tower | The part code cannot do. |
| Policy: thresholds → findings, severity, suppression | Flint code, versioned constants + existing rule config | Raw judgments stay reusable; changing a threshold never reruns inference. |

The engine may (a) add semantic findings, (b) suppress deterministic findings on a class
judged third-party above threshold, (c) attach a model-selected `rename-class` fix from
code-generated candidates, (d) supply a role where the detector scored below its
threshold. It never overrides an exact check with a model opinion.

### 2. Feature flag — four layers, one resolver

No flag system exists in Flint (PostHog flags are deliberately disabled in extension
bundles). Add the minimum that gives a build-time guarantee, a server kill switch and
user consent:

1. **Build flag** `VITE_ENABLE_AI_LINT`, default **off** (`=== "true"`, the opposite of
   the preset switches), baked as `define.__FLINT_AI_LINT__`. The engine is reached only
   through `if (__FLINT_AI_LINT__) await import("@/features/ai-lint")`, so an off build
   contains none of it. Declare it in `src/vite-env.d.ts`. Add a `flint` entry to
   `FORBIDDEN_RELEASE_ENV` in `scripts/build-cli.mjs` rejecting `"true"` on the
   production channel until the Marketplace update is cleared — the same mechanism
   Beacon uses for its gated surfaces — plus a dist gate: an off build must not contain
   the string `/api/v1/flint/ai-lint`.
2. **Server availability** (authoritative). Tower env `TOWER_FLINT_AI_LINT_ENABLED`
   (house boolean parse) AND key configured AND a runtime kill-switch column
   `tower_platform_metering.flint_ai_lint_enabled` (operator PATCH, no redeploy; the
   shipped bundle is immutable after review, so the off switch must live server-side).
   Surfaced on `GET /api/v1/flint/settings` as
   `aiLint: { available: boolean; reason: "ok" | "disabled" | "entitlement" | "not_configured" }`,
   following the `editorExperience` precedent, normalized in `normalizeEffectiveSettings`.
3. **Entitlement**. `resolveFlintFeatureGate` gains `aiLint: paid` (advisory); Tower
   enforces (free → 402).
4. **User opt-in**. `flintAppSettingsSchema` gains `aiLintEnabled: z.boolean().default(false)`
   (additive, `version` stays 1, syncs through the existing route). Turning it on shows
   the disclosure in §8 once. Default-off opt-in is a privacy requirement, not a
   product hedge: once on, AI lint is the default engine for that user.

One pure function decides, with a table test covering every combination:

```ts
// features/linter/lib/resolve-lint-engine.ts
export type LintEngineId = "deterministic" | "typesafe";
export function resolveLintEngine(i: {
  buildFlag: boolean; towerConfigured: boolean; signedIn: boolean;
  serverAvailable: boolean; gateAiLint: boolean; userOptIn: boolean;
}): LintEngineId
```

### 3. Engine port (refactor, no behaviour change)

`use-cases/scan-current-page.ts` and `use-cases/scan-selected-element.ts` already return
the exact shapes the stores consume, so they are the seam:

```ts
export interface LintEngine {
  scanPage(elements: unknown[], opts: PageLintOptions, run: LintRun): Promise<ScanCurrentPageWithMetaResult>;
  scanElement(element: unknown, structural: boolean, opts: ElementLintOptions, run: LintRun): Promise<ScanSelectedElementResult>;
}
export interface LintRun { id: number; signal: AbortSignal; onJudgments(results: RuleResult[]): void }
```

`deterministic-lint-engine.ts` is today's code moved verbatim. PR 1 ships only this plus
the flag plumbing; `fixture-integration.test.ts` and `parity.test.ts` must pass
unchanged, and a new test asserts byte-identical results through the port.

### 4. Class units — what leaves the browser

Built by a pure function from `LintContext` (no additional Designer API calls — the
context service already holds styles, parent map, tags, element types, roles and
component membership):

```ts
type AiLintUnit = {
  key: string;                 // SHA-256 (crypto.subtle) of the canonical unit JSON; opaque cache id
  className: string;           // ≤128 chars, control chars stripped
  classKind: ClassType; isCombo: boolean;
  tokens: string[];            // grammar parse
  usages: Array<{              // ≤3 representative usages, deduped by shape
    tag: string | null; elementType: string | null;
    detectedRole: ElementRole; roleScoreBelowThreshold: boolean;
    parentClassNames: string[];   // ≤5
    childClassNames: string[];    // ≤8
    childCountBucket: "0" | "1-3" | "4-10" | "11+";   // bucketed in code; the model does not count
  }>;
  renameCandidates: Array<{ id: string; value: string }>;  // ≤6, generated + grammar-validated in code
};
```

Rules: one unit per unique class, not per element. Utility classes, classes in the
user/preset/team ignore lists, and (when the setting is on) list-matched third-party
classes are filtered **before** egress and never leave the browser. No text content, no
attribute values, no style values, no element ids, no site id, no user id. Per-scan cap
600 units, custom/component classes first; overflow is reported in the status row, not
silently dropped.

### 4b. Region units — purpose and boundaries (the inference gap)

Class units answer "is this *name* good". They cannot answer Flint's hardest problem:
what an element is *for*, and where a section or component actually starts and ends.
That is a tree question, and today it is answered circularly.

**Diagnosis of the current detector stack**

- Role detection is name-only. `lumos-section-detector` recognises a section only if it
  carries `u-section` or a `section_|hero_|footer_…` prefix. An element that *is* a
  section but is not named like one gets `unknown`, so every structural rule skips it —
  the linter is blind to exactly the case it should report.
- The non-name signals are dead. `role-detection.service.ts:87-89` reads `el.tagName`,
  `el.textContent` and `el.attributes`, which are not Designer API properties (the tag is
  `await el.getTag()`; `textContent` on a Designer element is a capability boolean), so
  every snapshot has `tagName: "div"` and the `tag === "section"` hint never fires.
  `lint-context.service.ts` already collects real tags and element types — they are just
  not passed to detectors.
- Genuine platform limits remain: no rendered geometry or bounding boxes, component
  instance internals are opaque from the page, slots need a DOM fallback, style values
  are per-breakpoint and only read on `main`.

A model cannot infer from evidence it is not given, so this is two steps, in order.

**Step 1 — evidence layer (deterministic, free, ships without the flag).** Extend
`ElementSnapshot` with what the Designer API does expose, normalized in the adapter:
real `tag`, `elementType` (Section, Container, Heading, Link, FormForm, NavbarWrapper,
ComponentInstance, DynamoWrapper…), heading level, depth, sibling index, child-count
bucket, component membership, and a **layout signature** computed in code from
already-loaded style properties: `fullWidth`, `verticalPaddingBucket`, `display`
(block/flex/grid), `constrainsWidth` (max-width + auto margins), `positionedSticky/Fixed`.
All numerics are bucketed in code; the model never sees a pixel value. This alone fixes
the dead tag hint and lets plain detectors score "direct child of main, full width,
vertical padding, wraps a width-constraining child" as a section without any AI.

**Step 2 — region judgments.** For each *candidate boundary node* (has children, depth
≤4 under the page root, not inside a placed component instance — typically 20–60 per
page), Tower asks one request with independent questions over a compact state:

```ts
type AiLintRegionUnit = {
  key: string;
  node: RegionNode;                 // classes, tag, elementType, layout signature, headingLevels below
  ancestors: RegionNode[];          // root → parent, ≤4
  siblings: { before: RegionNodeBrief[]; after: RegionNodeBrief[] };   // ≤3 each
  children: RegionNodeBrief[];      // ≤8, plus childCountBucket
  descendantClassSample: string[];  // ≤12, deduped — the strongest purpose signal without text
  convention: string;               // preset id → server-side profile
};
```

| Question | Primitive | Used for |
| --- | --- | --- |
| Which structural role does `node` play? main / section / container / layout / componentRoot / childGroup / content / none | Choice | Role where the detector is silent or below threshold |
| Is `node` the outermost element of one self-contained page section? | Noul | Section boundary |
| Is `node` the root of a reusable component (vs. a part of its parent)? | Noul | Component boundary, root-vs-childGroup |
| What is the section for? hero / nav / footer / features / pricing / testimonials / cta / contact / about / content / unknown | Choice | Naming candidates |
| Which candidate name fits? (code-generated from purpose × preset grammar, + none) | Choice, speculative | `rename-class` / `add-class` fix |

Each question is single-hop over one named node — the shape Jev is reliable at; no
counting, no comparison across the tree.

**Code decodes the tree, not the model.** Per-node probabilities are reconciled with
hard invariants: exactly one main; sections do not nest; a section boundary is the
highest ancestor above threshold whose parent is not itself a section; a childGroup
must sit under a componentRoot. Where invariants and probabilities conflict, the region
is marked ambiguous and produces no finding.

**The disagreement is the finding.** This is what breaks the circularity:

- Model: section (high). Detector: nothing. → `ai:unnamed-section` — "acts as a page
  section but is not named as one", with the preset-correct candidate fix.
- Detector: section (by name). Model: not a boundary (high). → `ai:misplaced-section-name`.
- Same pair for componentRoot / childGroup.

**Styling stays deterministic.** "How should it be styled for this preset" is a recipe
(Client-First: `padding-global` → `container-*` → `padding-section-*`; Lumos:
`u-section` + `u-container`). The AI-supplied role feeds the existing structure rules,
which check the recipe exactly. The model never grades CSS values.

**Still not solvable:** component-instance internals, anything needing rendered
geometry, and purpose where neither names nor structure carry signal. For the last, the
real lever is heading text, which is page copy: **not sent in v1.** If the eval shows
purpose accuracy is inadequate without it, add a separate explicit opt-in ("include
heading text, ≤8 words per heading") with its own disclosure line — a product and
privacy decision, not an engineering default.

### 5. Wire contract (`packages/webflow-kit/src/flint/flint-ai-lint.ts`)

Zod schemas shared by both sides, `unknown` in, following the `flint-settings-tower-put`
pattern, with `FLINT_AI_LINT_ERROR_CODES` and `FLINT_AI_LINT_CONTRACT_VERSION = 1`.

- Request: `{ contractVersion: 1, presetId: string, units: AiLintUnit[], regions: AiLintRegionUnit[] }`,
  1–48 items combined, body ≤256 KB. Region judgments come back as a parallel
  `regionJudgments[]` (role choice + confidence, `sectionBoundary` and `componentRoot`
  nouls, purpose choice, rename candidate id), same normalization and `failedKeys` rules. `presetId` is a stable id selecting a **server-side** convention profile;
  unknown id → generic profile. The client never sends instructions, criteria or a model
  id: the endpoint cannot be used as a general TypeSafe proxy and class names cannot
  smuggle question text.
- Response: `{ contractVersion, promptVersion, model, judgments: AiLintJudgment[], failedKeys: string[] }`.

```ts
type AiLintJudgment = {
  key: string;
  nameQuality: { score: number; confidence: number };          // Score, 0–3
  nameElementMismatch: number;                                  // Noul
  thirdParty: number;                                           // Noul
  role: { choice: ElementRole; confidence: number } | null;     // Choice; only when a usage was below threshold
  rename: { candidateId: string | "none"; confidence: number } | null;
};
```

The response is numbers and enums only. Every user-visible string is composed in the
bundle from finding codes, so Tower cannot change UI text after review and nothing
remote is ever rendered as markup. `candidateId` and `key` are matched by id against
what this client sent; an id it did not send is discarded (stable ids, never labels).

### 6. Tower endpoint — `apps/tower/src/app/api/v1/flint/ai-lint/route.ts`

Under `/api/v1`, so middleware CORS (strict allowlist, never `*`) applies with no new
wiring. `runtime = "nodejs"`, `maxDuration = 15`. Sequence, mirroring
`flint/settings/route.ts` and the v2 proxy:

1. `verifyTowerApiRequest` → 401. Identity comes only from the session; the body carries
   no identifier, so there is nothing client-supplied to authorize on.
2. Availability (env + kill switch + key) → 503 `ai_lint_unavailable`.
3. `assertPostgresRateLimit("flint-ai-lint:user:" + userId, { maxAttempts: 40, windowSeconds: 60 })`
   → 429 + `Retry-After`.
4. JSON parse → 400; `parseFlintAiLintRequest` → 422 with error code. Malformed request
   is rejected whole, never trimmed to the valid subset.
5. `getActiveOrganizationIdForApiRequest` → `resolveTowerEntitlement`; free → 402
   `ENTITLEMENT_REQUIRED`. (Bearer sessions resolve with `fallback: "none"`; a user with
   no selected workspace is metered per-user — intended.)
6. `consumeAiLint(userId, entitlement, orgId, units.length)` → 402 `TOWER_USAGE_LIMIT`.
7. Fan out to TypeSafe (below), normalize, respond `Cache-Control: no-store`.
8. `after(() => recordMeterCost(...))` with compute ms and upstream input tokens.

**TypeSafe adapter** — `src/server/typesafe/` split per CLAUDE.md boundary rule:

- `typesafe-client.ts`: raw `fetch` to `https://api.typesafe.ai/v1/systemone`. No SDK:
  one endpoint, house style is raw fetch + own normalizers, and we need exact control of
  the deadline. Headers are constructed fresh — `Authorization: Bearer <TYPESAFE key>`
  and `Content-Type` only; the caller's bearer/cookies are never forwarded.
  `AbortSignal.timeout(4000)` per call, 8 s overall deadline, concurrency 12, one
  jittered retry on 429/529/5xx only if the deadline allows. Upstream 401/403 → logged
  operator error → 503 (it is our key, not the user's session). Model pinned to
  `jev-1.13.0`, not `jev-latest`: an alias that moves would silently invalidate the eval.
- `resolve-typesafe-api-key.ts`: reads `TYPESAFE_AI_API_KEY`, documented in
  `apps/tower/.env.example`, never `NEXT_PUBLIC_`.
- `build-ai-lint-questions.ts` (pure): unit + convention profile → `{ state, questions }`.
  One request per unit, five questions over the same state (independent, parallel, no
  added latency). `role` and `rename` are speculative: always asked when applicable,
  consumed only when the premise holds. State is named JSON
  (`class`, `usages`, `convention`, `renameCandidates`); instructions reference paths
  like `` `class.name` `` and `` `usages[0].tag` ``; criteria use structured
  `what / not_for / examples`; Score levels are concrete standalone situations; `rename`
  and `role` include an explicit no-match option.
- `normalize-ai-lint-answers.ts` (pure): answer map as runtime union → `AiLintJudgment | null`.
  Discriminates on `type`; requires finite numbers in range; requires `choice` to be a
  key we sent; a unit with any required answer missing/malformed goes to `failedKeys`
  whole — no partially applied judgment.
- `PROMPT_VERSION` constant, returned in the response and part of every cache key.

Logging: counts, latency, token usage, status codes. Never class names or state.

**Metering**: new kind `aiLint` (migration `0038_*`, additive columns with defaults):
`MeterKind`, `TOWER_USAGE_METER_KINDS`, `TowerTierLimits` + `CODE_DEFAULTS` + env seeds,
`towerPlatformMetering`, the three usage tables (+ `aiLintInputTokens` bigint),
`METER_COUNT_FIELD` / `METER_COST_FIELDS`, `usage-status.ts`. Units = judged class
units. Limits surface through the existing `{{limits.*}}` tokens — no hardcoded numbers
in copy.

### 7. Flint engine — `src/features/ai-lint/`

```
model/   ai-lint.types.ts · ai-lint-policy.ts (thresholds, POLICY_VERSION) · judgment-rules.ts
lib/     build-units.ts · build-rename-candidates.ts · hash-unit.ts · map-judgments.ts   (all pure)
services/ai-lint-client.ts · judgment-cache.ts · typesafe-lint-engine.ts
ui/      AiLintStatusRow.tsx · AiLintConsent.tsx · settings toggle
```

- **Judgment rules are registry rules.** New variant
  `JudgmentRule extends BaseRule { type: "judgment"; toResults(j, unit, config): RuleResult[] }`
  with ids `ai:name-quality`, `ai:name-element-mismatch`, `ai:third-party-class`,
  `ai:role-hint`. Enable/severity config, opinion modes, team config and Tower sync then
  work with zero new machinery; `contract.test.ts` is extended for the variant.
  `RuleResult` gains typed optional `origin?: "ai"` and `confidence?: number` (not
  `metadata`). The UI badge is a variant on the owning violation primitive, not a
  call-site style.
- **Two-phase results.** Deterministic results render immediately, exactly as today.
  Judgments merge in when they arrive (`aiStatus: idle | pending | done | degraded`).
  AI latency is never on the critical path of first paint.
- **Freshness.** Every run gets a monotonically increasing `runId` and an
  `AbortController`. A new run aborts the previous request; a late response whose
  `runId` or selection key no longer matches is dropped, never applied to a changed
  selection.
- **Cache.** In-memory LRU (2 000 entries) keyed `unit.key + promptVersion + contractVersion`.
  Rescans and selection changes send only uncached units; a typical reselect costs zero
  network. Threshold or severity changes re-map cached judgments with no request.
- **Traffic shape.** Page scan (explicit button): chunks of 48 units, at most 2
  concurrent requests to Tower. Selection: one-shot 350 ms debounce after the
  user's selection event, cache-first, skipped while the document is hidden. No polling,
  no interval, no observer, nothing that runs without a user action, and no canvas
  writes — quick fixes remain click-only.
- **Egress.** Only through `towerFetch`, with `credentials: "omit"` passed explicitly
  (bearer auth; matches Beacon's R8.10 posture). No bare `fetch`, no new host.
- **Failure policy** — every path degrades to deterministic results plus one status row:
  offline/timeout → "AI review unavailable"; 401 → one silent session re-exchange via the
  existing flow, then stop (no retry loop); 402 → entitlement/limit row; 429 → honour
  `Retry-After` for the rest of the run; 503 → treated as server flag off; `failedKeys`
  → those classes simply have no AI findings.
- **Telemetry.** `ai_lint_run { units, cached, latencyBucket, degradedReason }`. No class
  names; PostHog stays under `CODALYN_EXTENSION_POSTHOG_PRIVACY_OPTIONS`.
- **Bundle.** Lazy chunk, no new dependency (zod already ships via webflow-kit). The
  TypeSafe SDK is never in the client bundle.

### 8. Evaluation before thresholds (gate for PR 5)

Thresholds are evaluated, not guessed; confidence is distribution concentration, not
correctness, and Noul/Choice/Score thresholds do not transfer between each other.

- Dataset `apps/tower/evals/flint-ai-lint/`: ≥300 labelled units from the existing page
  fixtures plus real pages from our own sites, both presets, deliberately including
  third-party classes (swiper, splide, `w-*`), Webflow defaults, and adversarial names
  ("ignore previous instructions"). Labels bootstrapped by a reasoning-model ensemble,
  then hand-verified.
- `pnpm --filter @codalyn/tower eval:ai-lint` (live, key from env, manual) and a
  recorded-response replay that runs in CI.
- Report per judgment: precision/recall by threshold, confidence-vs-accuracy curve,
  self-consistency flip rate over 3 repeats, p50/p95 latency, input tokens per unit,
  $ per 1 000 units. Also A/B one-unit-per-request vs 8 units per state: the docs do not
  say whether shared state is billed once, and warn that unrelated state degrades
  accuracy — measure both before optimising request count.
- Region set: ≥25 whole pages (both presets, clean + messy + unnamed-div-soup) with
  hand-labelled section and component boundaries. Metrics are boundary-level
  precision/recall *after* the code decode step, reported against two baselines: today's
  name-only detectors, and the Step 1 evidence-layer detectors with no AI. If Step 1
  alone closes most of the gap, region judgments ship narrower or not at all.
- Ship gates: a finding type may emit `warning` only at ≥0.90 precision on the set;
  otherwise `suggestion` or off. Third-party suppression needs ≥0.97 precision (a wrong
  suppression hides a real violation). Any `PROMPT_VERSION` or model bump reruns the eval.

### 9. Webflow Marketplace review posture

Authority classification: the TypeSafe key is a third-party credential, issued by
TypeSafe, audience `api.typesafe.ai`, held only by Tower. It carries no Webflow
authority; Webflow OAuth scope rules are N/A to it. Flint's scopes do not change.

| Requirement | How this design meets it |
| --- | --- |
| No secrets in the bundle | Key exists only in Tower env. Move it out of `apps/flint/.env.local` (it is not `VITE_`-prefixed so it is not bundled today, but it is in the wrong app). New flint dist gate forbids `typesafe` (case-insensitive) in `dist` and zip. |
| Credential headers never forwarded to non-Webflow domains | Upstream headers built from scratch; test asserts the outbound request carries no caller header. |
| HTTPS, production-only destinations | Only destination is the baked Tower origin; existing dev-host strip + forbidden markers cover it. |
| Every endpoint authenticated; no authz on client ids; CORS not the control | Session-derived identity, no identifiers in the body, entitlement + meter server-side, allowlisted CORS as defence in depth. |
| No long-running background work; canvas writes user-initiated | One-shot debounce per user selection, explicit scan button, abort on supersede, read-only. |
| No remote-controlled UI / externally hosted surface | Response is typed data; all strings and UI ship in the reviewed bundle. |
| AI behaviour and data use disclosed | Listing + privacy policy name TypeSafe as a processor and list the categories sent (class names, tag names, element structure) and not sent (content, site/user identity). In-app opt-in shows the same list with the policy link on the Tower origin. TypeSafe's policy states no training on customer data; **read the DPA's retention terms and ask about ZDR (enterprise-only) before launch — not yet verified.** |
| Fully functional during review | Review account needs a paid entitlement and a rate limit a reviewer will not hit; demo video shows opt-in, AI findings, opt-out, and the degraded state. |
| Inspectable | Source maps via the existing private-zip pipeline; compliance-record entry with artifact sha. |

Pre-existing Flint gaps this RFC does not fix but which block any Flint Marketplace
submission of a Tower-enabled build, to be tracked separately: `window.open(` in
`tower-auth-client.ts`, `credentials: "include"` defaults in `towerFetch` and the session
exchange, no CSP meta in `index.html`, `<title>My React App</title>`, no pinned `fetch(`
count for flint, and `build-cli` not injecting/verifying a Tower origin for flint.

## Drawbacks

- A network dependency and per-scan cost on a tool whose appeal is being instant and
  offline. Mitigated by two-phase rendering, caching, and deterministic fallback, but it
  is real surface area: a route, a meter, a migration, an eval set to maintain.
- Probabilistic findings can erode trust in a linter faster than missing findings.
  Hence precision-first gates and `suggestion` as the default severity.
- Model drift: pinned model versions get retired; each bump costs an eval run.
- Class names are attacker-influenced input to a model. Blast radius is bounded to a
  wrong suggestion (typed output, client-validated candidate ids, no generated text, no
  auto-apply), but it is not zero.
- A new processor in the privacy story, and a Marketplace App Update review
  (10–15 business days) before production can enable the build flag.

## Alternatives

- **Call TypeSafe from the extension.** Rejected: key in the bundle, a new third-party
  host for Preflight's External API Calls finding, no metering, no kill switch.
- **Replace deterministic rules with model questions.** Rejected: slower, costs money,
  breaks offline, and hits Jev's documented weak spots (counting, character-level checks).
- **Generic TypeSafe proxy with client-authored questions.** Rejected: open cost
  amplifier, prompt injection surface, and review-time behaviour defined outside Tower.
- **A generative LLM for naming suggestions.** Rejected for v1: free text must be
  sanitized and rendered, latency is seconds, cost is orders of magnitude higher.
  Candidate selection gets most of the value.
- **`@typesafe-ai/sdk` on Tower.** Reasonable; rejected only because one endpoint does
  not justify a dependency and we want explicit deadline control. Revisit if the API grows.
- **Shared Postgres judgment cache** (answers keyed by unit hash, no inputs stored).
  Deferred until eval/production data shows the cross-user hit rate; note the Aug 2026
  Neon compute-quota outage before adding per-request reads.

## Adoption Strategy

Seven PRs, each independently green and revertable:

0. **Evidence layer (no flag, no network).** Pass real tag / element type / heading
   level / layout signature into `ElementSnapshot`; fix the dead `el.tagName` /
   `el.textContent` / `el.attributes` reads; add structure-based section scoring. Boundary
   tests per CLAUDE.md for the new adapter reads. Benefits free-tier users immediately
   and is the baseline the eval measures AI against.
1. **Port + flag plumbing, no behaviour change.** `LintEngine` port, deterministic engine,
   `resolveLintEngine` + table test, build define, `vite-env.d.ts`, settings field,
   feature gate, `FORBIDDEN_RELEASE_ENV.flint`, dist gate. Parity tests unchanged.
2. **Contract + Tower route** with mocked upstream: schemas and error codes in
   webflow-kit; route, adapter, question builder, normalizer. Tests per CLAUDE.md:
   canonical, alternate, missing, malformed (wrong type, NaN, out of range, unknown
   choice key), id-vs-label (unknown `candidateId` rejected); route tests for
   401/400/422/402/429/503/partial `failedKeys`; outbound-header test.
3. **Metering + kill switch.** Migration 0038, meter plumbing, operator toggle, usage
   status. Sequence after migration 0037 is applied; both are additive.
4. **Eval harness + dataset + calibration.** Produces `ai-lint-policy.ts` constants and
   a committed report. Blocks PR 5.
5. **Flint engine + UI.** Units, candidates, client, cache, judgment rules, two-phase
   stores, status row, consent, settings toggle. Tests: unit builder (ignored classes
   never emitted, caps, no content fields), hash stability, freshness guard (late
   response dropped), failure matrix, flag-off build contains no engine chunk.
6. **Compliance.** Privacy policy + listing copy, compliance-record entry,
   `/webflow-app-preflight` gate, `build:prod` artifact greps, App Review Preflight run.

Rollout: development channel → preview channel with internal accounts → production
server flag on with the build flag still rejected for Marketplace builds → App Update
submission → remove the `FORBIDDEN_RELEASE_ENV` entry once cleared. Tower changes are
additive and default-off, but Beacon is under Marketplace review until roughly
2026-10-02…10-09: deploy Tower for this work only with the env flag off and no change to
Beacon-facing routes, or wait for the decision.

Rollback at any time: operator kill switch (instant, no deploy) → env flag → build flag.
Each leaves Flint exactly as it behaves today.

## Open questions

1. Is Flint currently listed on the Marketplace, or is its Tower-enabled build still
   pre-submission? That decides whether step 6 is an App Update or part of a first submission.
2. Env var name: keep `TYPESAFE_AI_API_KEY` (as added) or the SDK-conventional
   `TYPESAFE_API_KEY`? The RFC assumes the former.
3. Monthly `aiLint` unit caps per tier — set after the eval reports tokens per unit.
4. Heading-text opt-in for purpose inference: decide only after the region eval shows
   whether names + structure are enough.
5. TypeSafe DPA retention terms / ZDR availability — needs a read and possibly an email
   to privacy@typesafe.ai before the disclosure copy is final.
