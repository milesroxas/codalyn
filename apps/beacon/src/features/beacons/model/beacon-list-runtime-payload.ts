/**
 * JSON stored in the **per-collection** Plain Text field whose display name is
 * “Beacon list target text · {dataList}” (and mirrored on the list target’s bound Text prop). Flow:
 *
 * 1. **Composer (CMS item)** — `saveBeaconListRuntimePayloadToCmsItem` writes this string to that field (staged + live) for
 *    the *current* collection entry, so every CMS row has its own `i` + `p`.
 * 2. **Published page** — the footer `beacon` runtime reads `listTarget.textContent` (JSON), clones hidden Engine children
 *    by `i` into the list target, then for each row applies `p[propId]` onto elements with matching `data-codalyn-beacon-prop`
 *    (keys are matched case-insensitively; the attribute may list `oldId|newId` separated by `|` for Webflow id churn).
 *
 * v2: `i` = clone order (indices into the hidden list’s children), `p` = parallel array of per-row `propId` → string.
 * `p` keys are **only** propIds the Engine had marked `exposed` in the slot file (not every Webflow prop on the
 * component). The footer runtime applies those keys to `data-codalyn-beacon-prop` nodes in each cloned row; a missing
 * key or empty/whitespace-only value sets `hidden` on that node (placeholders are not shown).
 */
export const BEACON_LIST_RUNTIME_JSON_VERSION = 2 as const;
/** Backward compatible reader for old CMS data. */
export const BEACON_LIST_RUNTIME_JSON_VERSION_LEGACY = 1 as const;

export type BeaconListRuntimePayloadV1 = {
  v: typeof BEACON_LIST_RUNTIME_JSON_VERSION_LEGACY;
  i: number[];
};

export type BeaconListRuntimePayload = {
  v: typeof BEACON_LIST_RUNTIME_JSON_VERSION;
  /** 0-based indices into the hidden list block’s `children` (the clone sources). */
  i: number[];
  /**
   * Parallel to `i`: string values for each property exposed in Engine, keyed by Webflow `propId`.
   * (Text, image URL / asset id, `true`/`false`, decimal numbers, hex colors, etc.)
   */
  p: Array<Record<string, string>>;
};

/** CMS/API may stringify `v`; footer runtime uses loose `+payload.v` — keep Composer parsing aligned. */
function normalizeBeaconPayloadVersion(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.trim()) : NaN;
  if (!Number.isFinite(n)) {
    return null;
  }
  const iv = Math.round(n);
  if (iv === BEACON_LIST_RUNTIME_JSON_VERSION || iv === BEACON_LIST_RUNTIME_JSON_VERSION_LEGACY) {
    return iv;
  }
  return null;
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

/**
 * @param childCount — used to clamp invalid indices; omit or use `0` to skip clamping
 */
export function parseBeaconListRuntimePayload(raw: string, childCount?: number): BeaconListRuntimePayload | null {
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
  let pList: Array<Record<string, string>> =
    v === BEACON_LIST_RUNTIME_JSON_VERSION && isStringRecordArray(pRaw, i.length)
      ? pRaw.map((row) => ({ ...row }))
      : i.map(() => ({}));
  if (pList.length !== i.length) {
    pList = i.map(() => ({}));
  }
  const indices: number[] = [];
  const p: Array<Record<string, string>> = [];
  for (let u = 0; u < i.length; u++) {
    const n = i[u];
    if (childCount != null && childCount > 0 && n >= childCount) {
      continue;
    }
    indices.push(n);
    p.push(pList[u] ?? {});
  }
  return { v: BEACON_LIST_RUNTIME_JSON_VERSION, i: indices, p };
}

function serializePropValueRow(src: Readonly<Record<string, string>> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (src == null) {
    return out;
  }
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined) {
      continue;
    }
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
}

/**
 * @param childIndices — 0-based indices of hidden list children, in display order
 * @param propRows — per displayed row, string values for exposed component props
 */
export function serializeBeaconListRuntimePayload(
  childIndices: readonly number[],
  propRows?: readonly Readonly<Record<string, string>>[] | null
): string {
  const i = [...childIndices];
  const p: Array<Record<string, string>> = [];
  for (let u = 0; u < i.length; u++) {
    const pru = propRows != null ? propRows[u] : undefined;
    p.push(serializePropValueRow(pru != null ? pru : null));
  }
  return JSON.stringify({
    v: BEACON_LIST_RUNTIME_JSON_VERSION,
    i,
    p,
  } satisfies BeaconListRuntimePayload);
}

/**
 * Sequential indices `0..count-1` (matches Composer order right after a full list rebuild).
 */
export function beaconListRuntimePayloadSequential(count: number): string {
  const i: number[] = [];
  for (let n = 0; n < count; n++) {
    i.push(n);
  }
  return serializeBeaconListRuntimePayload(i, null);
}
