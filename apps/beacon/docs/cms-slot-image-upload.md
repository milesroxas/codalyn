# CMS Slot Image Upload

Replace the Composer's crude paste-URL image control with the same upload → crop → optimize → Webflow-asset
pipeline that the Image Editor already ships, and let the Designer set required export constraints per exposed
image prop.

## Goal

- **Composer**: upload an image for a CMS slot image prop instead of pasting a URL. One frictionless flow:
  open → drop/pick → confirm → inline thumbnail. No format/dimension decisions at fill time.
- **Designer**: set export constraints (width, height, format, quality, max file size) on each exposed image prop.
- **No new pipeline, no new constraint type, no new storage location.** Reuse what Image Editor already owns.

## Decisions (locked)

| Question | Decision |
| --- | --- |
| Keep paste-URL fallback for image props? | **No.** Image props are upload-only. Remove the text input. |
| Per-prop export presets | **Required.** Designer must set constraints on every exposed image prop. Composer upload is blocked until set. |

## Scope

In scope — true image value types only: `image`, `imageAsset`, `cmsImage`, `imageSet`.

Non-goals:
- `file` (generic file) prop keeps its existing URL/asset input — not necessarily an image.
- `imageSet` stores a **single** optimized URL (no per-breakpoint set authoring). Same as today's runtime.
- No change to the runtime footer script or to how `propValues` serialize (still a URL string per `propId`).
- No change to the standalone `/images` Image Editor behavior.

## Single Source of Truth

Three things already exist and **must be reused**, not duplicated:

| Concern | Single owner | Path |
| --- | --- | --- |
| Export constraints **type** | `ExportConstraints` | `packages/webflow-kit/.../beacon-image-preset-domain.ts:119` |
| Constraints **validity check** | `hasValidExportConstraints` | image-editor export-dimensions module |
| Upload pipeline (validate → crop → encode WebP/AVIF → `createAsset`) | `applyCroppedImageToWebflow` + crop/encode/validate libs | `apps/beacon/src/features/image-editor/lib/*` |
| Crop/optimize **UI + interaction** | `ImageEditor` | `apps/beacon/src/features/image-editor/ui/image-editor.tsx` |
| Constraints **form fields** | `PresetFormStep2` / `PresetFormEncodingFields` | `apps/beacon/src/features/image-editor/ui/image-editor-preset-form-fields.tsx` |

## Data Model

### Per-prop constraints live with the exposure decision

The Designer slot-props config (`ComposableInstancePropMeta`, stored base64 in
`data-beacon-designer-slot-props`) is the one place that already knows "this prop is exposed." It becomes the
one place that knows "and here is how it's constrained." No second storage location, no cross-reference.

```ts
// cms-slot-composable-props.ts
export type ComposableInstancePropMeta = {
  propId: string;
  label: string;
  valueType: string;
  selectOptions?: ComposableInstancePropSelectOption[];
  /** Required when valueType is image-capable (image | imageAsset | cmsImage | imageSet). */
  imageExport?: ExportConstraints; // reused from @codalyn/webflow-kit — NOT a new type
};
```

### Composer value is unchanged

The composed value remains a **URL string** in `propValues[propId]` →
`CmsSlotListRuntimePayload.p[i][propId]`. The footer runtime that applies `src`/`background-image` is untouched.
The only difference: the string now comes from `asset.getUrl()` after an upload, not from the keyboard.

## Boundary Normalizer (required by repo Runtime Value-Shape rule)

`ExportConstraints` has no parser today (it is built inline by `toPresetConstraints`). Add one shared normalizer
next to the type and reuse it on **both** read paths (Designer write + Composer read):

```ts
// packages/webflow-kit/.../beacon-image-preset-domain.ts
export function readExportConstraints(raw: unknown): ExportConstraints | null;
```

Rules (per `CLAUDE.md`):
- Accept canonical and wrapped-equivalent shapes; normalize before logic.
- `width`/`height`: `parsePositiveIntegerString` — require **both** valid (paired) or treat as missing (`null`).
- `exportFormat` ∈ `{ "webp", "avif" }` else missing.
- `quality`: numeric in range else default-from-settings only when explicitly allowed.
- `maxFileSizeBytes`: `null` or positive int.
- Invalid/partial → return `null`. Never partially apply.

`hasValidExportConstraints` stays the validity predicate; `readExportConstraints` is the parse-from-storage step.

## Upload Seam — `compose` placement

The pipeline already returns assets to the canvas/CMS but **does not hand the asset URL back to a caller**. Add a
minimal placement that does.

```ts
// apply-cropped-export.ts
export type PlacementMode = "library" | "canvas" | "selection" | "replace" | "download" | "compose";

export type ExportResult =
  | { kind: "success"; message: string; cmsFieldUpdated?: boolean; asset?: { id: string; url: string } }
  | ...; // unchanged otherwise
```

`compose` branch in `applyCroppedImageToWebflow`:
1. `createAsset(file)` (same encode path as every other placement).
2. Place into the default Assets folder using the existing `cmsPrimaryUpload` default-folder logic
   (`resolveAssetFolderHandleForExport(..., { useDefaultWhenUnpicked: true })`) — no folder picker shown.
3. `url = await asset.getUrl()`; if empty → `{ kind: "error" }` (explicit, no silent fallback).
4. Return `{ kind: "success", asset: { id: asset.id, url } }`.

`ImageExportSuccessContext` gains `asset?: { id, url }`. `useApplyCroppedToWebflow.onExportSuccess(context)`
already fires synchronously on success → the Composer reads `context.asset.url`. No new wiring.

## Reusing `ImageEditor` (do not fork)

`ImageEditor` is a 1.6k-line orchestrator with no props, coupled to the route, settings, and Designer APIs.
Forking it would create a second source of truth for the crop/optimize UX. Instead, give it an **optional compose
session** so the same component serves both the route and the Composer drawer.

```ts
// image-editor.tsx
export function ImageEditor(props?: {
  composeSession?: {
    constraints: ExportConstraints;          // designer preset — locks dims/format/quality, hides the picker
    onComplete: (asset: { id: string; url: string }) => void;
    onCancel: () => void;
  };
}): JSX.Element;
```

When `composeSession` is present:
- Inject `constraints` at the **top** of the existing precedence in `resolveEffectiveExportConstraints` (above
  resolved readout / manual) — reuses the precedence machinery, no new resolver.
- Force `placement = "compose"`; hide placement picker, folder picker, and preset picker.
- Suppress route navigation (guarded behind compose mode).
- On success, call `composeSession.onComplete(context.asset)`.

Mount it inside the Composer using the existing stacked **Drawer** (`@/shared/ui/drawer`, nested variant), so it
layers cleanly over the Composer panel.

> Alternative considered: extract a headless `ImageUploadWorkspace`. Rejected for v1 — higher risk, and the
> additive-prop approach keeps `ImageEditor` the single owner of the crop UX.

## UI / Interaction (the part that must feel frictionless)

A single shared component owns all visual states; the Composer consumes its API. No styling at the call site
(per `CLAUDE.md` UI ownership rule). New affordances are variants on existing `shared/ui` primitives
(`button`, `tile`, `drawer`, `status-message`, plus a thumbnail variant).

```ts
// new: features/cms-slots/ui/cms-slot-composer-panel/cms-slot-image-prop-field.tsx
function CmsSlotImagePropField(props: {
  ep: ComposableInstancePropMeta; // carries imageExport
  value: string;                  // current URL ("" when unset)
  busy: boolean;
  onChange: (url: string) => void;
});
```

States:

| State | Condition | UI |
| --- | --- | --- |
| **Empty** | configured + no value | Tile/button "Upload image" (image icon). Click → compose Drawer. |
| **Filled** | value set | Inline thumbnail (fixed aspect from constraints) + Replace + Remove. |
| **Blocked** | `readExportConstraints(ep.imageExport)` is `null` | Disabled tile + hint: "Image size not set by Designer." |

Frictionless path (configured): **open → drop/pick → confirm → done.** The drawer opens already locked to the
Designer's dimensions/format, so the Composer makes zero encoding choices. Crop frame defaults to the preset
aspect; a single primary CTA ("Add image") uploads and closes the drawer; the thumbnail appears inline.

The `image` entry in `COMPOSER_PROP_VALUE_BY_KIND` (`composer-prop-value-field.tsx`) delegates to
`CmsSlotImagePropField` for the in-scope image value types. The plain `type="text"` URL input and
`CMS_SLOTS_COMPOSER_IMAGE_PROP_HINT` are removed for those types. `file` keeps the current input.

### Designer panel

In `CmsSlotDesignerExposePropsPanel`, checking an image-capable prop expands an inline constraints editor.
Reuse the existing fields by lifting the pure constraint controls into one shared component:

```ts
// extracted from image-editor-preset-form-fields.tsx, consumed by BOTH surfaces
function ExportConstraintsFields(props: { value: ExportConstraints; onChange: (next: ExportConstraints) => void; baseId: string });
```

Required enforcement: an exposed image prop with `readExportConstraints(...) === null` flags the row and blocks
publish/save with a clear message — no partial config persists.

## Permission / State Matrix

| Actor | Precondition | Result |
| --- | --- | --- |
| Designer | exposes image prop, no constraints | row flagged, save blocked |
| Designer | sets valid constraints | prop ready for Composer |
| Composer | constraints present | upload enabled (locked to preset) |
| Composer | constraints missing/invalid | field blocked, upload disabled |
| Composer | upload succeeds | `propValues[propId] = asset.url`, thumbnail shown |

## Validation & Tests (per `CLAUDE.md`)

`readExportConstraints` boundary tests:
- canonical shape; wrapped-equivalent shape
- missing fields (no width, no height)
- malformed (decimal where int; zero/negative; wrong type; empty string)
- width-without-height **pair** rule (one present → both treated missing)
- `exportFormat` not in `{webp,avif}` → missing
- `maxFileSizeBytes` negative → rejected; `null` → accepted

Behavioral:
- Composer image field blocked when constraints invalid — asserts **no partial apply**.
- `compose` placement returns `{ asset: { id, url } }`; empty `getUrl()` → `error`, value unchanged.
- Designer save guard blocks when an exposed image prop lacks valid constraints.
- Props matched by `propId`, never label (existing invariant — keep).

## File-Level Change List

**webflow-kit**
- `beacon-image-preset-domain.ts`: add `readExportConstraints`; export it. (+ tests)

**image-editor**
- `apply-cropped-export.ts`: add `"compose"` to `PlacementMode`; `asset` on success `ExportResult`; compose branch.
- `use-apply-cropped-to-webflow.ts`: thread `asset` into `ImageExportSuccessContext`.
- `image-editor.tsx`: optional `composeSession` prop; inject constraints into precedence; lock placement; guard nav.
- `image-editor-preset-form-fields.tsx`: extract `ExportConstraintsFields` (shared).

**cms-slots**
- `cms-slot-composable-props.ts`: add `imageExport?: ExportConstraints`.
- `cms-slot-designer-slot-props.ts`: persist `imageExport` (already base64 JSON — just include field); read via `readExportConstraints`.
- `cms-slot-designer-expose-props-panel.tsx`: inline `ExportConstraintsFields` on image props; required-state guard.
- `composer-prop-value-field.tsx`: image kind → `CmsSlotImagePropField`; drop URL input for image types.
- `cms-slot-image-prop-field.tsx` (new): empty/filled/blocked states + compose Drawer launch.
- Save/publish path: block when an exposed image prop has no valid constraints.

**shared/ui**
- Thumbnail/tile variant if not already present (variant on existing primitive; no call-site styling).

## Rollout

1. webflow-kit normalizer + tests.
2. `compose` placement + success `asset` (no UI yet).
3. `composeSession` prop on `ImageEditor`; extract `ExportConstraintsFields`.
4. Designer panel constraints editor + required guard.
5. Composer `CmsSlotImagePropField` + drawer; remove URL input.
6. Migration note: pre-existing exposed image props have no `imageExport` → render Blocked until Designer sets it
   (matches the "required" decision; no silent default).
