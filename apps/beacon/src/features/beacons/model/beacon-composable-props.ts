/**
 * Engine lists every bindable **instance** prop (via `searchProps`) so designers can choose what Studio exposes.
 * Per-row values still serialize to JSON `p` as strings (booleans `true`/`false`, numbers as text, link JSON, etc.).
 */

export type ComposableInstancePropSelectOption = { value: string; label: string };

export type ComposableInstancePropMeta = {
  propId: string;
  label: string;
  valueType: string;
  /** When Webflow provides discrete choices (e.g. component variants), Studio renders a select; values are `id` strings. */
  selectOptions?: ComposableInstancePropSelectOption[];
};

function labelFromInstanceProp(p: Pick<InstanceProp, "propId" | "display">): string {
  const l = p.display?.label;
  return typeof l === "string" && l.length > 0 ? l : p.propId;
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

/** Which control Studio renders for props the designer enabled in Engine. */
export type BeaconStudioPropFieldKind =
  | "multiline"
  | "line"
  | "url"
  | "email"
  | "tel"
  | "number"
  | "boolean"
  | "image"
  | "color"
  | "date";

/**
 * Webflow `BindableValueType` → Studio control. Unknown types use `line`.
 * `selectOptions` on {@link ComposableInstancePropMeta} wins in the UI (variant / enum with `display.options`).
 */
const STUDIO_FIELD_BY_VALUE_TYPE: Readonly<Partial<Record<string, BeaconStudioPropFieldKind>>> = {
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
  link: "url",
  video: "url",
  videoUrl: "url",
  email: "email",
  phone: "tel",
  file: "image",
  number: "number",
  headingTag: "number",
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
 * Maps Webflow `InstanceProp` `valueType` to a Studio field.
 */
export function beaconStudioFieldKindForValueType(valueType: string): BeaconStudioPropFieldKind {
  return STUDIO_FIELD_BY_VALUE_TYPE[valueType] ?? "line";
}

/**
 * Stabilize labels for “same” props when Webflow renames the label slightly (extra spaces, etc.).
 */
export function normalizeLabelForBeaconPropMatch(label: string): string {
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
    const norm = normalizeLabelForBeaconPropMatch(e.label);
    const cands = live.filter(
      (m) =>
        !usedLive.has(m.propId) && normalizeLabelForBeaconPropMatch(m.label) === norm && m.valueType === e.valueType
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

/** Merges Engine-stored “exposed” metas with current `searchProps()` so labels/options match the hidden list instance. */
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
export function buildBeaconRuntimePropRow(
  d: { propValues?: Readonly<Record<string, string>> | null },
  metas: readonly ComposableInstancePropMeta[],
  aliasToCanonical: ReadonlyMap<string, string>
): Record<string, string> {
  const o: Record<string, string> = {};
  for (const ep of metas) {
    o[ep.propId] = String(pickRemappedPropValue(ep.propId, d.propValues ?? undefined, aliasToCanonical) ?? "");
  }
  return o;
}

/**
 * `searchProps()` for each list row — keyed by `HydratedBeaconComponent.key` (matches hidden list instances).
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
 * All bindable instance props (full `InstanceProp` from `searchProps`), for Engine “Expose to Studio”.
 */
export async function listComposablePropsForInstance(
  instance: ComponentElement
): Promise<ComposableInstancePropMeta[]> {
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
      selectOptions: selectOptionsFromInstanceProp(p),
    });
  }
  const out = [...byId.values()];
  out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  return out;
}
