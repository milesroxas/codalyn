# Beacon Rich Text Editor — Implementation Plan

> Purpose: a reusable Lexical-based rich text editor for Beacon. First consumer is the CMS Slots
> Composer (rich-text props); the primitive is built feature-agnostic so later Beacon features can
> reuse it. Covers the editor primitive, CMS Slots integration, boundary normalization, and the
> published-page **runtime** changes required to render formatted HTML.
>
> Status: planning. No code written yet. Owner: TBD.

---

## 1. Goals & non-goals

### Goals

- Reusable rich text editor primitive under `apps/beacon/src/shared/ui/` built on **Lexical** (`@lexical/react`).
- shadcn-consistent: `cva` variants, `cn()`, `data-slot` attributes, lucide icons, existing shared/ui
  primitives (`toggle`, `toggle-group`, `popover`, `separator`, `tooltip`) for toolbar chrome.
- Wire it into the CMS Slots Composer so a Webflow `richText` prop edits with formatting instead of a
  plain `<Textarea>`.
- Update the **published-page runtime** so rich-text prop values render as real HTML in the Webflow
  `.w-richtext` element (today everything goes in via `el.textContent`, which flattens HTML to plain text).
- Keep the boundary safe: normalize + sanitize HTML before it leaves the Composer (CLAUDE.md
  Runtime Value-Shape Safety Rule).

### Non-goals (v1)

- No images/embeds/tables inside rich text (Webflow rich text supports them, but they add asset-pipeline
  and runtime complexity — defer to a later phase).
- No collaborative/real-time editing.
- No promotion to `packages/webflow-kit` yet (Beacon-only first; promote when a second app needs it — §13).
- No change to the `CmsSlotListRuntimePayload` schema or version. Rich-text values stay **strings** in
  `p[rowIndex][propId]`; only their *content* becomes HTML.

---

## 2. Current state (what exists today)

| Concern | Today | File |
|---|---|---|
| `richText` prop control | maps to `multiline` → plain `<Textarea>` | [composer-prop-value-field.tsx:207](../apps/beacon/src/features/cms-slots/ui/cms-slot-composer-panel/composer-prop-value-field.tsx#L207) |
| valueType → field kind | `richText: "multiline"` | [cms-slot-composable-props.ts:98](../apps/beacon/src/features/cms-slots/model/cms-slot-composable-props.ts#L98) |
| Composer → payload row | `buildCmsSlotRuntimePropRow` (per-type normalize for `headingTag`, `link`) | [cms-slot-composable-props.ts:345](../apps/beacon/src/features/cms-slots/model/cms-slot-composable-props.ts#L345) |
| Runtime value apply | `applyValue(el, v)` — default branch is `el.textContent = v` | [cms-slot-beacon-prop-runtime.ts:228](../apps/beacon/src/features/cms-slots/model/cms-slot-beacon-prop-runtime.ts#L228) |
| Empty detection (conditional vis) | `bPropEmpty` string check | same runtime file |
| Footer script generator | `getCmsSlotPageInlineScriptSource()` | [cms-slot-page-inline-script.ts:51](../apps/beacon/src/features/cms-slots/model/cms-slot-page-inline-script.ts#L51) |
| Content binding marker | `data-cb-c="propId|propId@N"` | runtime |
| Conditional-visibility marker | `data-cb-v="1"` | runtime |
| Sanitization | none in repo (safe today only because everything is `textContent`) | — |

**The pivotal fact:** the runtime writes text-bound nodes with `el.textContent`. A Webflow rich-text
element publishes as `<div class="w-richtext"><p>…</p></div>`; setting `textContent` destroys the nested
markup and inserts a single text node. To render formatting we must apply rich-text values via
`innerHTML` — which introduces an XSS surface and therefore a **mandatory sanitization step** (§9, §11).

---

## 3. Architecture: four layers

Keep boundary adaptation separate from domain logic and from the reusable UI (CLAUDE.md).

```
┌─ shared/ui/rich-text-editor/ ─────────────── PRIMITIVE (feature-agnostic) ─┐
│  Lexical editor. Props: value(HTML), onChange(HTML), config, placeholder,  │
│  disabled, variant. Knows nothing about CMS slots or Webflow.              │
└────────────────────────────────────────────────────────────────────────────┘
              ▲ consumed by
┌─ features/cms-slots/ui/.../composer-rich-text-field.tsx ─ FEATURE ADAPTER ─┐
│  Wraps the primitive for the Composer: debounced commit, busy state,      │
│  empty handling, wired to onChangePropValue.                              │
└────────────────────────────────────────────────────────────────────────────┘
              ▲ values flow through
┌─ features/cms-slots/model/ ───────────────── BOUNDARY / DOMAIN ───────────┐
│  sanitize + normalize HTML, empty-HTML detection, buildCmsSlotRuntime-    │
│  PropRow richText branch. Pure functions, fully unit-tested.             │
└────────────────────────────────────────────────────────────────────────────┘
              ▼ serialized into payload, then on the published site
┌─ cms-slot-beacon-prop-runtime.ts (generated footer IIFE) ─ RUNTIME ───────┐
│  applyValue: rich-text-marked nodes → innerHTML; everything else          │
│  unchanged (textContent). Empty check understands empty HTML.            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Storage format decision: **sanitized HTML string**

The editor serializes to and hydrates from an **HTML string** stored in `propValues[propId]`.

**Why HTML (not Lexical JSON):**

- The runtime footer is a tiny minified IIFE and must **not** bundle Lexical. HTML is directly
  applicable with `innerHTML`; Lexical JSON would force the runtime to ship a JSON→HTML renderer.
- Webflow's published rich-text element is HTML (`.w-richtext`); HTML is the native target.
- Payload shape is unchanged — value stays a `string`, no schema/version bump.
- Round-trips well enough: `@lexical/html` exports clean HTML from a constrained node set and re-imports
  it via `$generateNodesFromDOM`. We do not need byte-identical round-trips, only semantic stability over
  our allowlist (paragraph, headings, bold/italic/underline, links, lists, quote, line break).

**Rejected alternatives:**

- *Lexical JSON in payload* → runtime can't render it without bundling a renderer. No.
- *Dual storage (JSON for editing + HTML for runtime)* → two sources of truth, payload bloat, sync bugs.
  HTML-only with `$generateNodesFromDOM` on load is simpler and good enough.

**Legacy values:** existing `richText` props are plain text. On load, a value with no element tags is
imported as a single paragraph (plain text → one `<p>`). At runtime, plain text applied via `innerHTML`
renders identically to before (no tags to interpret). Backward compatible (§10).

---

## 5. Dependencies

Add to `apps/beacon/package.json` (pnpm, React 19 — all Lexical packages support React 19):

```
lexical                 # core
@lexical/react          # LexicalComposer, RichTextPlugin, ContentEditable, plugins
@lexical/rich-text      # HeadingNode, QuoteNode
@lexical/list           # ListNode, ListItemNode + list commands
@lexical/link           # LinkNode, AutoLinkNode
@lexical/html           # $generateHtmlFromNodes / $generateNodesFromDOM (HTML <-> Lexical)
@lexical/utils          # mergeRegister, $findMatchingParent, node helpers
@lexical/selection      # selection/format helpers
@lexical/markdown       # (optional) markdown shortcuts (**bold**, - list, ## h2)
```

Bundle note: lazy-load the editor (`React.lazy` + dynamic import) so Lexical (~30–45KB gz with plugins)
is code-split out of the main Composer chunk and only loads when a rich-text field opens (§12).

Runtime footer: **no new dependencies** — it stays a hand-rolled IIFE.

Marketplace review note (2026-09-17, superseding the earlier "kept as the one accepted observer" note):
**the editor is withheld from Marketplace bundles.** Lexical's core constructs a `MutationObserver` on the
contenteditable root when the editor mounts (`initMutationObserver`), and Webflow's App Review Preflight
reports every such constructor as "Silent Canvas Mutations" regardless of target — four scans in a row.
The observer is load-bearing (`$commitPendingUpdates` gates Lexical's DOM reconcile on it, `flushMutations`
evicts browser-inserted IME text nodes), so it cannot be stubbed, and every other contenteditable editor
carries the same constructor (ProseMirror/TipTap, Slate, Quill). The editor therefore sits behind the
`VITE_BEACON_RICH_TEXT_EDITOR_ENABLED` release flag: unset (every Marketplace bundle) the dynamic import
is dead-code-eliminated, `new MutationObserver(` in the zip is pinned to **0**, any `lexical` trace fails
the release build, and a `richText` prop is composed as HTML in a plain `<Textarea>`. Flag on, everything
below applies unchanged. Full write-up: `docs/webflow-marketplace/compliance-record.md` § R8.8.
Do not add an observer anywhere in Beacon.

---

## 6. The primitive: `shared/ui/rich-text-editor/`

A self-contained, shadcn-style component. No CMS or Webflow knowledge. This is the owning primitive per
CLAUDE.md "UI Styling Ownership Rule" — consumers use its API, they do not restyle it at the call site.

### 6.1 File tree

```
apps/beacon/src/shared/ui/rich-text-editor/
├── rich-text-editor.tsx           # public component + cva variants + LexicalComposer setup
├── rich-text-editor-config.ts     # editor theme (class map), node list, default RichTextConfig
├── rich-text-editor-toolbar.tsx   # toolbar using toggle/toggle-group/popover/separator/tooltip
├── plugins/
│   ├── toolbar-state-plugin.ts    # subscribes to selection -> active-format state for the toolbar
│   ├── html-value-plugin.ts       # controlled value: import HTML in, emit HTML out (debounced)
│   └── link-plugin.tsx            # link insert/edit popover, URL validation, AutoLink
├── lib/
│   ├── rich-text-html.ts          # htmlToLexicalNodes / lexicalToHtml wrappers over @lexical/html
│   └── rich-text-empty.ts         # isRichTextHtmlEmpty(html): boolean
├── index.ts
└── __tests__/
    ├── rich-text-html.test.ts
    └── rich-text-empty.test.ts
```

### 6.2 Public API

```ts
export type RichTextFeature =
  | "bold" | "italic" | "underline"
  | "h2" | "h3"
  | "bulletList" | "orderedList"
  | "link" | "quote" | "clear";

export type RichTextConfig = {
  /** Toolbar feature allowlist, in display order. Defaults to the full v1 set. */
  features?: RichTextFeature[];
  /** Cap matching the bound Webflow field, if known. */
  maxLength?: number;
};

export type RichTextEditorProps = {
  /** Controlled HTML value. */
  value: string;
  /** Emits sanitized* HTML on change (debounced). (*sanitized at the model boundary, see §9.) */
  onChange: (html: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  config?: RichTextConfig;
  /** cva surface variant. */
  variant?: "default" | "compact";
  className?: string;
  "aria-label"?: string;
  id?: string;
};
```

- `cva` drives the editor surface (border, focus ring, padding) to match `Input`/`Textarea`
  (`border-input`, `focus-visible:ring-3 focus-visible:ring-ring/50`, `text-sm`). `compact` = denser
  padding for narrow Composer columns.
- `data-slot="rich-text-editor"`, `data-slot="rich-text-toolbar"`, `data-slot="rich-text-content"` on the
  parts, matching the rest of shared/ui.
- Controlled: `value` (HTML) is the source of truth. `html-value-plugin` imports `value` on mount and on
  external change (guarded so it doesn't clobber active typing), and emits HTML via `onChange` on edit
  (debounced ~250ms). `onBlur` flushes immediately.
- `disabled` → `editable={false}` on the Lexical editor + dimmed toolbar.

### 6.3 Nodes & theme

- Nodes registered: `HeadingNode`, `QuoteNode`, `ListNode`, `ListItemNode`, `LinkNode`, `AutoLinkNode`
  (paragraph/text/linebreak are built in). The registered node set **is** the allowlist — Lexical drops
  anything not registered during HTML import, which is the first line of sanitization defense.
- Theme maps node types to Webflow-friendly classes so the editor preview roughly matches published
  output. Output HTML uses semantic tags (`<strong>`, `<em>`, `<u>`, `<h2>`, `<ul>`, `<a>`, `<blockquote>`)
  — Webflow's `.w-richtext` styles them on the live site.

### 6.4 Toolbar (shadcn primitives only — no new chrome)

- `ToggleGroup` (`variant="segmented"`, `size="xs"`) groups inline formats (bold/italic/underline) and
  block formats (h2/h3/quote); `Toggle` for standalone toggles; `Separator` between groups; `Tooltip`
  on each; lucide icons (`Bold`, `Italic`, `Underline`, `Heading2`, `Heading3`, `List`, `ListOrdered`,
  `Link`, `Quote`, `RemoveFormatting`).
- Link uses `Popover` + `Input` + `Button` (insert/edit/remove, URL validated; `javascript:` rejected).
- `toolbar-state-plugin` reads the current selection's active formats/block type and reflects them as the
  pressed state — single source of truth for button state.

---

## 7. CMS Slots integration

### 7.1 New field kind

Introduce a dedicated `richText` kind so only Webflow's actual rich-text prop gets the editor — plain
multiline types (`text`, `textContent`, `slot`, …) stay on `<Textarea>`. Small blast radius.

`apps/beacon/src/features/cms-slots/model/cms-slot-composable-props.ts`:

```ts
export type CmsSlotComposerPropFieldKind =
  | "richText"      // NEW
  | "multiline"
  | "line" | "url" | "link" | "email" | "tel" | "number"
  | "boolean" | "visibility" | "image" | "color" | "date";

const COMPOSER_FIELD_BY_VALUE_TYPE: Readonly<Partial<Record<string, CmsSlotComposerPropFieldKind>>> = {
  // ...
  richText: "richText",   // was "multiline"
  text: "multiline",      // unchanged
  // ...
};
```

### 7.2 Composer adapter — `composer-rich-text-field.tsx`

New file beside `cms-slot-image-prop-field.tsx`. Wraps the primitive for the Composer:

```tsx
// features/cms-slots/ui/cms-slot-composer-panel/composer-rich-text-field.tsx
const RichTextEditor = lazy(() =>
  import("@/shared/ui/rich-text-editor").then((m) => ({ default: m.RichTextEditor }))
);

export function ComposerRichTextField({ inputId, ep, value, busy, onChange }: ComposerPropValueFieldProps) {
  return (
    <Suspense fallback={<Textarea disabled value={value} className="min-h-16 text-sm" />}>
      <RichTextEditor
        id={inputId}
        aria-label={ep.label}
        value={value}
        disabled={busy}
        variant="compact"
        onChange={onChange}
      />
    </Suspense>
  );
}
```

### 7.3 Wire into the field map

`composer-prop-value-field.tsx` — add a `richText` entry to `COMPOSER_PROP_VALUE_BY_KIND`:

```tsx
richText: (p) => <ComposerRichTextField {...p} />,
multiline: ({ inputId, value, busy, onChange }) => ( /* unchanged Textarea */ ),
```

`onChange` still calls `onChangePropValue(rowKey, propId, html)` exactly as the Textarea did — the value
is just HTML now. No change to `ComposerSlotEditView`, draft shape, or `propValues: Record<string,string>`.

---

## 8. Empty detection (conditional visibility)

Webflow conditional-visibility (`data-cb-v="1"`) hides an element when its bound value is empty. For HTML,
`<p></p>`, `<p><br></p>`, `&nbsp;`, and whitespace-only must count as empty. Provide one shared predicate,
used in **three** places so editor / placeholder seeding / runtime agree:

```ts
// shared/ui/rich-text-editor/lib/rich-text-empty.ts
export function isRichTextHtmlEmpty(html: string): boolean; // strips tags + &nbsp; + whitespace, checks ""
```

- Composer: drive placeholder/"empty" affordance.
- `cms-slot-hidden-list-publish-placeholders.ts`: the existing `richText` placeholder seed (`" "`)
  and `isBeaconPropValueEmpty` logic ([line ~76](../apps/beacon/src/features/cms-slots/model/cms-slot-hidden-list-publish-placeholders.ts#L76)) must treat empty-HTML as empty.
- Runtime: `bPropEmpty` must mirror this (a minimal inline version — §9).

---

## 9. Boundary normalization & sanitization (model layer)

Per CLAUDE.md, adapt + validate at the boundary, before domain logic. Add a `richText` branch to
`buildCmsSlotRuntimePropRow` — same pattern as `headingTag` / `link`:

```ts
// cms-slot-composable-props.ts (buildCmsSlotRuntimePropRow)
if (ep.valueType === "headingTag") {
  v = normalizeHeadingTagForPayload(v, ep.selectOptions);
} else if (isCmsSlotLinkValueType(ep.valueType)) {
  v = beaconLinkRuntimeValue(v);
} else if (ep.valueType === "richText") {
  v = sanitizeBeaconRichTextHtml(v);   // NEW boundary normalize
}
```

`sanitizeBeaconRichTextHtml(raw): string` — new pure helper in
`features/cms-slots/model/cms-slot-rich-text-html.ts`:

- **Allowlist tags:** `p, br, strong, b, em, i, u, a, ul, ol, li, h2, h3, blockquote`.
- **Allowlist attrs:** `href, target, rel` on `<a>` only. Strip everything else (no `style`, no `class`,
  no `on*`).
- **Links:** allow only `http:`, `https:`, `mailto:`, `tel:` schemes; drop `javascript:`/`data:`. Force
  `rel="noopener noreferrer"` when `target="_blank"`.
- **Strip** `<script>`, `<style>`, comments, and any non-allowlisted element (unwrap or drop).
- Collapse empty-HTML to `""` via `isRichTextHtmlEmpty` so conditional visibility works.
- Return explicit `""` for invalid/empty — never invent content (CLAUDE.md: no silent fallbacks).

Implementation: a small allowlist walk over a parsed `DOMParser` document (Beacon runs in the browser).
Avoid a heavy dependency; if one is wanted, `dompurify` with a strict config is acceptable, but the
constrained editor node set already keeps output narrow, so a focused allowlist is preferred and testable.

> This sanitizer runs in the **Beacon app** at save time (defense-in-depth before the value is stored and
> shipped). The runtime still does a minimal guard (§9.1) since it ultimately calls `innerHTML`.

### 9.1 Runtime apply — `cms-slot-beacon-prop-runtime.ts`

`applyValue(el, v)` gains a rich-text branch **before** the `textContent` default. Detection by explicit
marker, with the structural Webflow class as fallback:

```js
// inside applyValue(el, v) — generated runtime source (as shipped; see cms-slot-beacon-prop-runtime.ts)
if (bIsRichTextEl(el)) {          // data-cb-html="1" from the Designer, or a .w-richtext wrapper
  var sh = bSafeHtml(v);          // DOMParser parse → allowlisted nodes rebuilt into a detached container, or null
  if (sh == null) { el.textContent = v; } else { bRenderNodes(el, sh); }   // moves nodes in; no innerHTML
  return;
}
// ...existing IMG/A/INPUT/TEXTAREA branches...
el.textContent = v;              // unchanged default
```

The original plan assigned `el.innerHTML = bSafeHtml(v)`; Marketplace review (compliance doc R7b.11,
"Unsafe HTML Injection") flags every `innerHTML` write, so the runtime now renders **nodes**: `bSafeHtml`
returns a container built from the parsed document over the same allowlist and `bRenderNodes` appends its
children. Nothing is re-parsed from a string on the published site.

- `data-cb-html="1"` is written by the **Designer** when a `richText` prop is bound (alongside
  `data-cb-c`), so the runtime matches by a stable marker, not presentation text (CLAUDE.md: match by
  stable IDs/markers). `.w-richtext` is a structural fallback for safety.
- `bSafeHtml(v)` is the runtime allowlist pass in the IIFE (DOMParser, tag allowlist, `bSafeHref`
  https/mailto/tel-only links, `rel="noopener noreferrer"` on `_blank`; falls back to `textContent` when
  parsing is unavailable). The authoritative sanitization already happened at the boundary (§9); this ensures
  the footer never blindly trusts the payload string.
- `bPropEmpty` updated so empty-HTML (`<p></p>`, `&nbsp;`, whitespace) hides conditional elements.

Because the runtime source is a generated string, bump its hash so `data-codalyn-beacon-src-hash` drift
detection re-syncs published pages.

### 9.2 Designer marker write

Wherever the Designer tags bound elements with `data-cb-c` for a `richText` prop, also set
`data-cb-html="1"`. (Find the bind step that emits `data-cb-c`; add the marker for `valueType === "richText"`.)

---

## 10. Backward compatibility & migration

- **Existing plain-text richText values:** import as a single `<p>`; render unchanged via `innerHTML`
  (no tags → same visual result). No data migration needed.
- **Payload v3 unchanged:** values remain strings; old published pages keep working. Pages re-publish with
  the new runtime (hash drift triggers re-sync) and gain HTML rendering automatically.
- **Other multiline types** (`text`, `textContent`, `slot`, …) keep `<Textarea>` + `textContent` — untouched.
- **No marker on old pages:** elements without `data-cb-html` / `.w-richtext` fall to `textContent` exactly
  as before — graceful.

---

## 11. Security (XSS) — required

Rendering author-supplied markup on the published site is the only new attack surface (as nodes, never
`innerHTML` — see §9.1). Threat model: a Composer editor (an
authenticated site operator) is the input source, so risk is moderate — but treat it as untrusted anyway.

Defense in depth, four layers:

1. **Constrained editor** — only allowlisted nodes are registered; Lexical drops the rest on import.
2. **Boundary sanitizer** (`sanitizeBeaconRichTextHtml`, §9) — strict tag/attr allowlist + URL scheme
   filter, runs at save time in the Beacon app. This is the authoritative pass.
3. **Runtime guard** (`bSafeHtml` + `bRenderNodes`, §9.1) — allowlist rebuild from a DOMParser parse in
   the footer IIFE, rendered as nodes; never trusts the payload blindly.
4. **Link hardening** — `rel="noopener noreferrer"` forced on `target="_blank"`.

Test the sanitizer against the standard payloads: `<script>`, `<img onerror>`, `javascript:` href,
`<a href="data:…">`, inline `style`/event handlers, malformed/unbalanced tags. (See §12.)

---

## 12. Performance

- **Lazy-load** the editor (`React.lazy` + dynamic import in the adapter, §7.2) → Lexical code-splits out
  of the main Composer chunk; Textarea fallback shows while it loads.
- **Debounce** HTML serialization (`$generateHtmlFromNodes` is non-trivial) to ~250ms; flush on blur.
  Avoid serializing on every keystroke.
- **Memoize** the editor config / initial config (`useMemo`) so the `LexicalComposer` isn't re-initialized
  per render. Guard the controlled-value import so external `value` updates don't reset the cursor while
  typing.
- Beacon is a Vite SPA — no SSR/hydration concerns for `contentEditable`.

---

## 13. Testing plan (CLAUDE.md boundary requirements)

Vitest + jsdom (`*.test.tsx` → jsdom via `environmentMatchGlobs`). Co-locate tests.

**`rich-text-html.test.ts` (HTML <-> Lexical round-trip):**
- canonical: `<p><strong>x</strong></p>` round-trips.
- alternate equivalent shapes: `<b>`≈`<strong>`, `<i>`≈`<em>` normalize consistently.
- plain text (no tags) imports as one paragraph (legacy shape).
- missing/empty input → `""`.
- malformed/unbalanced HTML doesn't throw; produces safe output.

**`sanitizeBeaconRichTextHtml` tests (the security boundary):**
- strips `<script>`, `<style>`, comments, event handlers (`onerror`, `onclick`), inline `style`/`class`.
- drops non-allowlisted tags (`<iframe>`, `<img>` for v1) — unwrap text, keep content.
- link schemes: `http/https/mailto/tel` kept; `javascript:`/`data:` dropped.
- `target="_blank"` ⇒ `rel="noopener noreferrer"` enforced.
- keeps the full allowlist intact.

**`rich-text-empty.test.ts`:**
- empty: `""`, `<p></p>`, `<p><br></p>`, `&nbsp;`, `   ` → `true`.
- non-empty: `<p>x</p>`, `<ul><li>x</li></ul>` → `false`.

**Runtime apply (`cms-slot-beacon-prop-runtime` source):**
- node with `data-cb-html="1"` ⇒ `innerHTML` (markup preserved); test in jsdom by evaluating the
  generated `applyValue` source against a DOM fixture.
- `.w-richtext` fallback path.
- non-marked node ⇒ `textContent` (existing behavior unregressed).
- `bSafeHtml` strips `<script>`/`on*`.
- `bPropEmpty` treats empty-HTML as empty (conditional hidden).

**`buildCmsSlotRuntimePropRow`:**
- `richText` valueType routes through `sanitizeBeaconRichTextHtml`; `text`/others pass through verbatim.

---

## 14. Phased rollout

- [ ] **Phase 0 — deps:** add Lexical packages to `apps/beacon/package.json`; `pnpm install`; confirm
      build + bundle splits.
- [ ] **Phase 1 — primitive:** build `shared/ui/rich-text-editor/` (editor, config, toolbar, plugins,
      `rich-text-html`, `rich-text-empty`) + tests. Verify in isolation (a throwaway story/route).
- [ ] **Phase 2 — boundary:** `sanitizeBeaconRichTextHtml` + `isRichTextHtmlEmpty` wiring; `richText`
      branch in `buildCmsSlotRuntimePropRow`; placeholder empty-check update + tests.
- [ ] **Phase 3 — Composer wiring:** new `richText` field kind; `ComposerRichTextField` adapter; map entry
      in `composer-prop-value-field.tsx`. Plain-text multiline unchanged.
- [ ] **Phase 4 — runtime:** `applyValue` rich-text branch (`innerHTML` + `bSafeHtml`), `bPropEmpty`
      update, source-hash bump; Designer writes `data-cb-html="1"` on `richText` binds. Test generated
      source in jsdom.
- [ ] **Phase 5 — e2e verify:** compose a slot with a Webflow rich-text prop, publish, confirm formatted
      HTML renders in `.w-richtext` and conditional visibility hides empty rich text. Re-publish an old
      page to confirm graceful upgrade.

---

## 15. File-change summary

| File | Change |
|---|---|
| `apps/beacon/package.json` | + Lexical deps |
| `apps/beacon/src/shared/ui/rich-text-editor/**` | **new** primitive (editor, toolbar, plugins, html/empty helpers, tests) |
| `features/cms-slots/model/cms-slot-composable-props.ts` | new `richText` field kind; `richText: "richText"` map; `sanitizeBeaconRichTextHtml` branch in `buildCmsSlotRuntimePropRow` |
| `features/cms-slots/model/cms-slot-rich-text-html.ts` | **new** `sanitizeBeaconRichTextHtml` + tests |
| `features/cms-slots/ui/cms-slot-composer-panel/composer-rich-text-field.tsx` | **new** adapter (lazy-loads primitive) |
| `features/cms-slots/ui/cms-slot-composer-panel/composer-prop-value-field.tsx` | `richText` entry in `COMPOSER_PROP_VALUE_BY_KIND` |
| `features/cms-slots/model/cms-slot-hidden-list-publish-placeholders.ts` | empty-HTML aware emptiness check |
| `features/cms-slots/model/cms-slot-beacon-prop-runtime.ts` | `applyValue` rich-text `innerHTML` branch + `bSafeHtml` + `bPropEmpty` update |
| Designer bind step (emits `data-cb-c`) | also set `data-cb-html="1"` for `richText` props |

---

## 16. Open questions / future work

- **Images/embeds in rich text** — needs the existing Beacon image/asset pipeline + a runtime image apply
  path inside HTML. Defer; design as a `RichTextFeature` extension.
- **Promote to `packages/webflow-kit/src/react`** — when Flint or Tower need the editor. The primitive is
  already app-agnostic, so promotion is a move + export, plus matching peer deps. Until then, Beacon-only.
- **Max length / validation surfacing** — if Webflow exposes a character cap for the bound field, thread
  it through `RichTextConfig.maxLength` and show a counter.
- **Markdown shortcuts** — `@lexical/markdown` is listed optional; enable if editors want `**bold**` / `##`.
- **Paste sanitization** — pasted rich content should pass through the same node allowlist (Lexical's
  paste import already filters to registered nodes; confirm in Phase 1).
```
