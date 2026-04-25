/**
 * JSON for the per-collection **“Beacon list target text · {dataList}”** field (and list target Text prop bound
 * to it). The published page runtime reads this string from the list target, then clones hidden `beacon_list`
 * children by index (`i`). One CMS item ⇒ one `fieldData` value; the footer script is site-wide, the **payload**
 * is per entry.
 */
export const BEACON_LIST_RUNTIME_JSON_VERSION = 1 as const;

export type BeaconListRuntimePayload = {
  v: typeof BEACON_LIST_RUNTIME_JSON_VERSION;
  /** 0-based indices into the hidden list block’s `children` (the clone sources). */
  i: number[];
};

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
  const v = (parsed as { v?: unknown }).v;
  const i = (parsed as { i?: unknown }).i;
  if (v !== BEACON_LIST_RUNTIME_JSON_VERSION || !isIndexArray(i)) {
    return null;
  }
  if (childCount != null && childCount > 0) {
    return { v: BEACON_LIST_RUNTIME_JSON_VERSION, i: i.filter((n) => n < childCount) };
  }
  return { v: BEACON_LIST_RUNTIME_JSON_VERSION, i: [...i] };
}

/**
 * @param childIndices — 0-based indices of hidden list children, in display order
 */
export function serializeBeaconListRuntimePayload(childIndices: readonly number[]): string {
  return JSON.stringify({
    v: BEACON_LIST_RUNTIME_JSON_VERSION,
    i: [...childIndices],
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
  return serializeBeaconListRuntimePayload(i);
}
