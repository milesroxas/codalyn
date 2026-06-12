/**
 * JSON stored in the **per-collection** Plain Text field whose display name is
 * “CMS slot target text · {dataList}” (and mirrored on the list target’s bound Text prop). Flow:
 *
 * 1. **Composer (CMS item)** — `saveCmsSlotListRuntimePayloadToCmsItem` writes this string to that field (staged + live) for
 *    the *current* collection entry, so every CMS row has its own `i` + `p`.
 * 2. **Published page** — the footer `beacon` runtime reads `listTarget.textContent` (JSON), clones hidden Designer children
 *    by `i` into the list target (empty or missing `i` ⇒ no rows; invalid JSON does not fall back to the full Designer list),
 *    then for each row applies `p[propId]` onto elements with matching `data-cb-c`
 *    (keys are matched case-insensitively; the attribute may list `propId@N` segments separated by `|` for duplicate sites).
 *    When the same exposed prop is bound on multiple elements, later sites are tagged `propId@N` (ordinal) but still
 *    resolve the Composer value via the base `propId`. A shared nested definition carries one segment per Designer
 *    component that exposes it, so each cloned row resolves its own value.
 *
 * v3: `i` = clone order (indices into the hidden list’s children), `p` = parallel array of per-row `propId` → string.
 * `p` keys are **only** propIds the Designer had marked `exposed` in the slot file (not every Webflow prop on the
 * component), and **only** props the Composer actually set (empty values are omitted). The footer runtime applies those
 * keys to `data-cb-c` nodes in each cloned row; when a value is set it reveals the node (clearing
 * `w-condition-invisible` on ancestor wrappers). When a key is absent the runtime leaves the authored default content
 * for plain content, and hides nodes flagged conditional (`data-cb-v`) so empty conditionals do not show placeholders.
 *
 * Optional `n` (parallel to `i`/`p`) stores Composer-only **slot display names**. The footer runtime ignores `n`; it is
 * for Composer UX persistence in the same JSON blob.
 */
import { isBeaconPropValueEmpty } from "@/features/cms-slots/model/cms-slot-beacon-prop-runtime";
import { designerPoolIndexForRuntimeCloneIndex } from "@/features/cms-slots/model/cms-slot-page-targets";

export const CMS_SLOT_LIST_RUNTIME_JSON_VERSION = 3 as const;
/** Max length for a Composer slot display name persisted in payload `n[]`. */
export const CMS_SLOT_ROW_NAME_MAX = 80 as const;

export type CmsSlotListRuntimePayload = {
  v: typeof CMS_SLOT_LIST_RUNTIME_JSON_VERSION;
  /** 0-based indices into the hidden list block’s `children` (the clone sources). */
  i: number[];
  /**
   * Parallel to `i`: string values for each property exposed in Designer, keyed by Webflow `propId`.
   * (Text, image URL, `true`/`false`, decimal numbers, hex colors, etc.)
   */
  p: Array<Record<string, string>>;
  /** Optional parallel slot labels (Composer); ignored by footer runtime. */
  n?: string[];
};

/** CMS/API may stringify `v`; footer runtime uses loose `+payload.v` — keep Composer parsing aligned. */
function normalizeBeaconPayloadVersion(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.trim()) : NaN;
  if (!Number.isFinite(n)) {
    return null;
  }
  const iv = Math.round(n);
  return iv === CMS_SLOT_LIST_RUNTIME_JSON_VERSION ? iv : null;
}

function isIndexArray(x: unknown): x is number[] {
  if (!Array.isArray(x)) {
    return false;
  }
  for (const n of x) {
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0) {
      return false;
    }
  }
  return true;
}

function isStringRecordArray(x: unknown, len: number): x is Array<Record<string, string>> {
  if (!Array.isArray(x) || x.length !== len) {
    return false;
  }
  for (const row of x) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      return false;
    }
    for (const v of Object.values(row as Record<string, unknown>)) {
      if (typeof v !== "string") {
        return false;
      }
    }
  }
  return true;
}

export function sanitizeSlotLabelForPayload(s: string): string {
  const t = s.trim();
  if (t === "") return "";
  return t.length <= CMS_SLOT_ROW_NAME_MAX ? t : t.slice(0, CMS_SLOT_ROW_NAME_MAX);
}

/**
 * Single rule for “what label do we show / persist?”: optional `n[]` entry wins when non-empty after sanitize;
 * otherwise the Webflow **component definition** display name (per hidden-list row).
 */
export function resolveCmsSlotPublishedDisplayName(
  componentDefinitionName: string,
  persistedLabel: string | null | undefined
): string {
  if (persistedLabel == null) {
    return componentDefinitionName;
  }
  const label = sanitizeSlotLabelForPayload(persistedLabel);
  return label !== "" ? label : componentDefinitionName;
}

/**
 * For each Designer pool row (hidden list index), derive the label shown in Composer from the live v2 payload, or the
 * component name when the payload is missing or that pool index has **mixed** composed-row labels (same index used
 * more than once with different `n[]` entries).
 */
export function publishedDisplayNamesForDesignerPool(
  payload: CmsSlotListRuntimePayload | null,
  designerScopedRows: ReadonlyArray<{ name: string; domChildIndex?: number }>
): string[] {
  if (payload == null || payload.i.length === 0) {
    return designerScopedRows.map((r) => r.name);
  }
  const collected = new Map<number, string[]>();
  for (let u = 0; u < payload.i.length; u++) {
    const poolIdx = designerPoolIndexForRuntimeCloneIndex(designerScopedRows, payload.i[u]);
    if (poolIdx < 0 || poolIdx >= designerScopedRows.length) {
      continue;
    }
    const defName = designerScopedRows[poolIdx]?.name ?? "";
    const resolved = resolveCmsSlotPublishedDisplayName(defName, payload.n?.[u]);
    const arr = collected.get(poolIdx) ?? [];
    arr.push(resolved);
    collected.set(poolIdx, arr);
  }
  return designerScopedRows.map((row, j) => {
    const labels = collected.get(j);
    if (labels == null || labels.length === 0) {
      return row.name;
    }
    const first = labels[0];
    return labels.every((x) => x === first) ? first : row.name;
  });
}

function resolvePayloadPropList(
  normalizedVersion: number,
  pRaw: unknown,
  indices: readonly number[]
): Array<Record<string, string>> {
  let pList: Array<Record<string, string>> =
    normalizedVersion === CMS_SLOT_LIST_RUNTIME_JSON_VERSION && isStringRecordArray(pRaw, indices.length)
      ? pRaw.map((row) => ({ ...row }))
      : indices.map(() => ({}));
  if (pList.length !== indices.length) {
    pList = indices.map(() => ({}));
  }
  return pList;
}

function filterRuntimePayloadLists(input: {
  rawIndices: readonly number[];
  propRows: readonly Record<string, string>[];
  childCount?: number;
  slotSource: readonly string[] | null;
}): { indices: number[]; p: Array<Record<string, string>>; nAligned: string[] } {
  const { rawIndices, propRows, childCount, slotSource } = input;
  const indices: number[] = [];
  const p: Array<Record<string, string>> = [];
  const nAligned: string[] = [];
  for (let u = 0; u < rawIndices.length; u++) {
    const idx = rawIndices[u];
    if (childCount != null && childCount > 0 && idx >= childCount) {
      continue;
    }
    indices.push(idx);
    p.push(propRows[u] ?? {});
    if (slotSource != null) {
      nAligned.push(sanitizeSlotLabelForPayload(slotSource[u]));
    }
  }
  return { indices, p, nAligned };
}

/**
 * @param childCount — used to clamp invalid indices; omit or use `0` to skip clamping
 */
export function parseCmsSlotListRuntimePayload(raw: string, childCount?: number): CmsSlotListRuntimePayload | null {
  const t = raw.trim();
  if (t.length === 0) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(t) as unknown;
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const vRaw = (parsed as { v?: unknown }).v;
  const v = normalizeBeaconPayloadVersion(vRaw);
  const i = (parsed as { i?: unknown }).i;
  if (v == null || !isIndexArray(i)) {
    return null;
  }
  const pRaw = (parsed as { p?: unknown }).p;
  const pList = resolvePayloadPropList(v, pRaw, i);
  const nSrcRaw = (parsed as { n?: unknown }).n;
  const slotSource: readonly string[] | null =
    v === CMS_SLOT_LIST_RUNTIME_JSON_VERSION &&
    Array.isArray(nSrcRaw) &&
    nSrcRaw.length === i.length &&
    nSrcRaw.every((x): x is string => typeof x === "string")
      ? nSrcRaw
      : null;
  const includeSlotLabels = slotSource !== null;

  const { indices, p, nAligned } = filterRuntimePayloadLists({
    rawIndices: i,
    propRows: pList,
    childCount,
    slotSource: includeSlotLabels ? slotSource : null,
  });

  const out: CmsSlotListRuntimePayload = { v: CMS_SLOT_LIST_RUNTIME_JSON_VERSION, i: indices, p };
  if (includeSlotLabels && nAligned.length === indices.length) {
    out.n = nAligned;
  }
  return out;
}

/**
 * v3 omits empty/whitespace content values so the footer runtime leaves un-edited props at their authored default
 * (fail-open). Conditional elements (`data-cb-v`) without a value are hidden by the runtime, so an absent key both
 * preserves defaults for plain content and conceals empty conditionals.
 */
function serializePropValueRow(src: Readonly<Record<string, string>> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (src == null) {
    return out;
  }
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined) {
      continue;
    }
    const str = typeof v === "string" ? v : String(v);
    if (isBeaconPropValueEmpty(str)) {
      continue;
    }
    out[k] = str;
  }
  return out;
}

/**
 * @param childIndices — 0-based indices of hidden list children, in display order
 * @param propRows — per displayed row, string values for exposed component props
 * @param slotLabels — parallel Composer slot names (optional); lengths must match `childIndices`
 */
export function serializeCmsSlotListRuntimePayload(
  childIndices: readonly number[],
  propRows?: readonly Readonly<Record<string, string>>[] | null,
  slotLabels?: readonly string[] | null
): string {
  const i = [...childIndices];
  const p: Array<Record<string, string>> = [];
  for (let u = 0; u < i.length; u++) {
    const pru = propRows != null ? propRows[u] : undefined;
    p.push(serializePropValueRow(pru != null ? pru : null));
  }
  const base: CmsSlotListRuntimePayload = {
    v: CMS_SLOT_LIST_RUNTIME_JSON_VERSION,
    i,
    p,
  };
  if (slotLabels != null && slotLabels.length === i.length && slotLabels.every((_) => typeof _ === "string")) {
    base.n = slotLabels.map((s) => sanitizeSlotLabelForPayload(s));
  }
  return JSON.stringify(base);
}

/**
 * Sequential indices `0..count-1` (matches Composer order right after a full list rebuild).
 */
export function cmsSlotListRuntimePayloadSequential(count: number): string {
  const i: number[] = [];
  for (let n = 0; n < count; n++) {
    i.push(n);
  }
  return serializeCmsSlotListRuntimePayload(i, null);
}
