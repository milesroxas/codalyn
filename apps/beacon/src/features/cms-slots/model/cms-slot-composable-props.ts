/**
 * Designer lists every bindable **instance** prop (via `searchProps`) so designers can choose what Composer exposes.
 * Per-row values still serialize to JSON `p` as strings (booleans `true`/`false`, numbers as text, link JSON, etc.).
 */

import { type ExportConstraints, readExportConstraints } from "@codalyn/webflow-kit";
import { beaconLinkRuntimeValue, isCmsSlotLinkValueType } from "@/features/cms-slots/model/cms-slot-link-value";

export type ComposableInstancePropSelectOption = { value: string; label: string };

export type ComposableInstancePropMeta = {
  propId: string;
  label: string;
  valueType: string;
  /** Webflow props-panel group/folder the prop lives in (`display.group`); `undefined` when ungrouped. */
  group?: string;
  /** When Webflow provides discrete choices (e.g. component variants), Composer renders a select; values are `id` strings. */
  selectOptions?: ComposableInstancePropSelectOption[];
  /**
   * Designer-set export constraints for upload-capable image props (`image | imageAsset | cmsImage | imageSet`).
   * Required before the Composer can upload; reused from `@codalyn/webflow-kit` (not a new type). Normalize reads
   * through `readExportConstraints`.
   */
  imageExport?: ExportConstraints;
};

function labelFromInstanceProp(p: Pick<InstanceProp, "propId" | "display">): string {
  const l = p.display?.label;
  return typeof l === "string" && l.length > 0 ? l : p.propId;
}

export function groupFromInstanceProp(p: Pick<InstanceProp, "display">): string | undefined {
  const g = p.display?.group;
  return typeof g === "string" && g.trim().length > 0 ? g : undefined;
}

function selectOptionsFromInstanceProp(
  p: Pick<InstanceProp, "display">
): ComposableInstancePropSelectOption[] | undefined {
  const opts = p.display?.options;
  if (opts == null || opts.length === 0) {
    return undefined;
  }
  return opts.map((o) => ({ value: o.id, label: o.name ?? o.id }));
}

/** Which control Composer renders for props the designer enabled in Designer. */
export type CmsSlotComposerPropFieldKind =
  | "multiline"
  | "line"
  | "url"
  | "link"
  | "email"
  | "tel"
  | "number"
  | "boolean"
  | "image"
  | "color"
  | "date";

/**
 * Webflow `BindableValueType` → Composer control. Unknown types use `line`.
 * `selectOptions` on {@link ComposableInstancePropMeta} wins in the UI (variant / enum with `display.options`).
 */
const COMPOSER_FIELD_BY_VALUE_TYPE: Readonly<Partial<Record<string, CmsSlotComposerPropFieldKind>>> = {
  string: "line",
  richText: "multiline",
  text: "multiline",
  textContent: "multiline",
  slot: "multiline",
  reference: "multiline",
  referenceSet: "multiline",
  filter: "multiline",
  sort: "multiline",
  selectedItems: "multiline",
  booleanFilter: "multiline",
  date: "date",
  url: "url",
  link: "link",
  video: "url",
  videoUrl: "url",
  email: "email",
  phone: "tel",
  file: "image",
  number: "number",
  /** `selectOptions` from Webflow supplies the control; fallback is a plain line input. */
  headingTag: "line",
  boolean: "boolean",
  image: "image",
  imageAsset: "image",
  cmsImage: "image",
  imageSet: "image",
  color: "color",
  enum: "line",
  option: "line",
  variant: "line",
  altText: "line",
  id: "line",
  visibility: "boolean",
};

/**
 * Maps Webflow `InstanceProp` `valueType` to a Composer field.
 */
export function cmsSlotComposerFieldKindForValueType(valueType: string): CmsSlotComposerPropFieldKind {
  return COMPOSER_FIELD_BY_VALUE_TYPE[valueType] ?? "line";
}

const CMS_SLOT_IMAGE_VALUE_TYPES = new Set(["image", "imageAsset", "cmsImage", "imageSet", "file"]);

/** Webflow image-capable instance prop `valueType`s (Composer stores a hosted image URL string). */
export function isCmsSlotImageValueType(valueType: string): boolean {
  return CMS_SLOT_IMAGE_VALUE_TYPES.has(valueType);
}

/**
 * True image value types that use the Composer upload → crop → optimize flow (and require Designer export
 * constraints). Excludes `file` (a generic file, not necessarily an image — keeps its plain URL input).
 */
const CMS_SLOT_UPLOAD_IMAGE_VALUE_TYPES = new Set(["image", "imageAsset", "cmsImage", "imageSet"]);

export function isCmsSlotUploadImageValueType(valueType: string): boolean {
  return CMS_SLOT_UPLOAD_IMAGE_VALUE_TYPES.has(valueType);
}

/** True once an exposed upload-image prop carries valid Designer export constraints; gates the Composer upload. */
export function isExposedImagePropConstrained(prop: ComposableInstancePropMeta): boolean {
  return readExportConstraints(prop.imageExport) !== null;
}

/**
 * Any exposed upload-image prop missing valid constraints blocks Designer save/publish — no partial config
 * reaches the Composer (matches the "required per-prop preset" decision; no silent default).
 */
export function hasUnconstrainedExposedImageProps(slotExposed: readonly ComposableInstancePropMeta[]): boolean {
  return slotExposed.some(
    (entry) => isCmsSlotUploadImageValueType(entry.valueType) && !isExposedImagePropConstrained(entry)
  );
}

const HEADING_LEVEL_IN_TAG_RE = /^h([1-6])$/i;

/**
 * Maps Webflow heading-tag prop values to `h1`..`h6` in the list runtime JSON so the footer script can apply levels
 * without duplicating option-id tables in the minified runtime.
 */
export function normalizeHeadingTagForPayload(
  raw: string,
  selectOptions?: readonly ComposableInstancePropSelectOption[] | undefined
): string {
  const t = String(raw ?? "").trim();
  if (t === "") {
    return "";
  }
  const asTag = t.match(HEADING_LEVEL_IN_TAG_RE);
  if (asTag != null) {
    return `h${asTag[1]}`;
  }
  if (/^[1-6]$/.test(t)) {
    return `h${t}`;
  }
  const opt = selectOptions?.find((o) => o.value === t);
  if (opt != null) {
    const fromLabel = headingLevelFromOptionLabel(opt.label);
    if (fromLabel != null) {
      return fromLabel;
    }
  }
  return t;
}

function headingLevelFromOptionLabel(label: string): string | undefined {
  const s = label.trim();
  const direct = s.match(HEADING_LEVEL_IN_TAG_RE);
  if (direct) {
    return `h${direct[1]}`;
  }
  const fromHeadingWord = s.match(/heading\D*([1-6])\b/i);
  if (fromHeadingWord) {
    return `h${fromHeadingWord[1]}`;
  }
  return undefined;
}

/**
 * Stabilize labels for “same” props when Webflow renames the label slightly (extra spaces, etc.).
 */
function normalizeLabelForCmsSlotPropMatch(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function getLiveMetaByIdCaseAware(
  byLiveId: ReadonlyMap<string, ComposableInstancePropMeta>,
  propId: string
): ComposableInstancePropMeta | undefined {
  const m = byLiveId.get(propId);
  if (m != null) {
    return m;
  }
  const lower = propId.toLowerCase();
  for (const [k, v] of byLiveId) {
    if (k.toLowerCase() === lower) {
      return v;
    }
  }
  return undefined;
}

export type MergedComposableExposed = {
  metas: ComposableInstancePropMeta[];
  /**
   * Maps any key still present in `propValues` or CMS `p` rows (legacy Webflow `propId`s, casing variants)
   * to the **current** canonical `searchProps` `propId` for that slot.
   */
  aliasToCanonical: ReadonlyMap<string, string>;
};

/**
 * Like {@link mergeComposableMetaWithLive}, but:
 * 1) matches live props by `propId` with **case-insensitive** fallbacks;
 * 2) when a stored `propId` is no longer in `searchProps` (e.g. component edit / Webflow regen), rebinds to a live
 *    prop with the same normalized label and `valueType` when the match is **unambiguous** among *unused* live rows.
 */
export function mergeComposableMetaWithLiveResolved(
  exposed: ComposableInstancePropMeta[],
  live: ComposableInstancePropMeta[] | undefined
): MergedComposableExposed {
  const aliasToCanonical = new Map<string, string>();
  if (exposed.length === 0) {
    return { metas: [], aliasToCanonical };
  }
  if (live == null || live.length === 0) {
    for (const e of exposed) {
      aliasToCanonical.set(e.propId, e.propId);
    }
    return { metas: exposed, aliasToCanonical };
  }
  const byLiveId = new Map(live.map((m) => [m.propId, m] as const));
  const usedLive = new Set<string>();
  const metas: ComposableInstancePropMeta[] = [];

  for (const e of exposed) {
    const direct = getLiveMetaByIdCaseAware(byLiveId, e.propId);
    if (direct != null) {
      const canon = direct.propId;
      metas.push({ ...e, ...direct });
      usedLive.add(canon);
      aliasToCanonical.set(e.propId, canon);
      if (e.propId !== canon) {
        aliasToCanonical.set(canon, canon);
      }
      continue;
    }
    const norm = normalizeLabelForCmsSlotPropMatch(e.label);
    const cands = live.filter(
      (m) =>
        !usedLive.has(m.propId) && normalizeLabelForCmsSlotPropMatch(m.label) === norm && m.valueType === e.valueType
    );
    if (cands.length === 1) {
      const m = cands[0];
      metas.push({ ...e, ...m });
      usedLive.add(m.propId);
      aliasToCanonical.set(e.propId, m.propId);
      aliasToCanonical.set(m.propId, m.propId);
    } else {
      metas.push(e);
      aliasToCanonical.set(e.propId, e.propId);
    }
  }

  return { metas, aliasToCanonical };
}

/** Merges Designer-stored “exposed” metas with current `searchProps()` so labels/options match the hidden list instance. */
export function mergeComposableMetaWithLive(
  exposed: ComposableInstancePropMeta[],
  live: ComposableInstancePropMeta[] | undefined
): ComposableInstancePropMeta[] {
  return mergeComposableMetaWithLiveResolved(exposed, live).metas;
}

/**
 * Resolves a string from `values` for the **canonical** `propId` after {@link mergeComposableMetaWithLiveResolved}:
 * checks the canonical key, then case-only variants, then any key that aliases to the same canonical id.
 */
export function pickRemappedPropValue(
  canonicalPropId: string,
  values: Readonly<Record<string, string>> | null | undefined,
  aliasToCanonical: ReadonlyMap<string, string>
): string | undefined {
  if (values == null) {
    return undefined;
  }
  if (Object.getOwnPropertyDescriptor(values, canonicalPropId) !== undefined) {
    return values[canonicalPropId];
  }
  for (const k of Object.keys(values)) {
    if (k.toLowerCase() === canonicalPropId.toLowerCase()) {
      return values[k];
    }
  }
  for (const k of Object.keys(values)) {
    if (aliasToCanonical.get(k) === canonicalPropId) {
      return values[k];
    }
  }
  return undefined;
}

/**
 * **Runtime row** (CMS JSON `p[i]`) — one string per current `propId` in resolved metas, including `""` so the footer
 * can clear bindings. Legacy keys in `propValues` are remapped.
 */
export function buildCmsSlotRuntimePropRow(
  d: { propValues?: Readonly<Record<string, string>> | null },
  metas: readonly ComposableInstancePropMeta[],
  aliasToCanonical: ReadonlyMap<string, string>
): Record<string, string> {
  const o: Record<string, string> = {};
  for (const ep of metas) {
    let v = String(pickRemappedPropValue(ep.propId, d.propValues ?? undefined, aliasToCanonical) ?? "");
    if (ep.valueType === "headingTag") {
      v = normalizeHeadingTagForPayload(v, ep.selectOptions);
    } else if (isCmsSlotLinkValueType(ep.valueType)) {
      v = beaconLinkRuntimeValue(v);
    }
    o[ep.propId] = v;
  }
  return o;
}

/**
 * `searchProps()` for each list row — keyed by `HydratedCmsSlotRow.key` (matches hidden list instances).
 */
export async function listComposableMetaByInstanceKey(
  rows: ReadonlyArray<{ key: string; instance: ComponentElement }>
): Promise<Record<string, ComposableInstancePropMeta[]>> {
  const next: Record<string, ComposableInstancePropMeta[]> = {};
  for (const row of rows) {
    try {
      next[row.key] = await listComposablePropsForInstance(row.instance);
    } catch {
      next[row.key] = [];
    }
  }
  return next;
}

/**
 * All bindable instance props (full `InstanceProp` from `searchProps`), for Designer “Expose to Composer”.
 */
async function listComposablePropsForInstance(instance: ComponentElement): Promise<ComposableInstancePropMeta[]> {
  let rows: InstanceProp[];
  try {
    rows = await instance.searchProps();
  } catch {
    return [];
  }
  const byId = new Map<string, ComposableInstancePropMeta>();
  for (const p of rows) {
    if (byId.has(p.propId)) {
      continue;
    }
    byId.set(p.propId, {
      propId: p.propId,
      label: labelFromInstanceProp(p),
      valueType: String(p.valueType),
      group: groupFromInstanceProp(p),
      selectOptions: selectOptionsFromInstanceProp(p),
    });
  }
  const out = [...byId.values()];
  out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  return out;
}
