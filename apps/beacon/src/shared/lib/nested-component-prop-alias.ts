function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** `getSettings()` rows and nested instance `getProps()` values: `{ sourceType: "prop", propId }` (flat or nested under `value`). */
export function bindingPropIdFromSettingValue(v: unknown): string | null {
  if (!isRecord(v)) {
    return null;
  }
  const fromBindingShape = (row: Record<string, unknown>): string | null => {
    if (row.sourceType !== "prop") {
      return null;
    }
    const id = row.propId;
    return typeof id === "string" && id.length > 0 ? id : null;
  };
  const direct = fromBindingShape(v);
  if (direct != null) {
    return direct;
  }
  const inner = v.value;
  if (!isRecord(inner)) {
    return null;
  }
  return fromBindingShape(inner);
}

export function canonicalExposedPropId(
  boundPropId: string,
  exposedIds: ReadonlySet<string>,
  nestedAlias: ReadonlyMap<string, string>
): string | null {
  if (exposedIds.has(boundPropId)) {
    return boundPropId;
  }
  const mapped = nestedAlias.get(boundPropId);
  return mapped != null && exposedIds.has(mapped) ? mapped : null;
}

/**
 * Which nested instance props receive an exposed parent prop (directly or via an upstream nested alias).
 * Used to decide whether to `enterComponent` this instance and how to translate inner element bindings.
 */
export function mapNestedPropsToExposedIds(
  props: ReadonlyArray<{ propId: string; value: unknown }>,
  exposedIds: ReadonlySet<string>,
  upstreamAlias: ReadonlyMap<string, string> = new Map()
): Map<string, string> {
  const alias = new Map<string, string>();
  for (const p of props) {
    const linked = bindingPropIdFromSettingValue(p.value);
    if (linked == null) {
      continue;
    }
    const canonical = exposedIds.has(linked) ? linked : upstreamAlias.get(linked);
    if (canonical != null && exposedIds.has(canonical)) {
      alias.set(p.propId, canonical);
    }
  }
  return alias;
}

export async function nestedAliasForComponentInstance(
  inst: ComponentElement,
  exposedIds: ReadonlySet<string>,
  upstreamAlias: ReadonlyMap<string, string>
): Promise<Map<string, string>> {
  const props = await inst.getProps().catch(() => [] as InstancePropSummary[]);
  return mapNestedPropsToExposedIds(props, exposedIds, upstreamAlias);
}

export type NestedPublishSeedPair = {
  nestedPropId: string;
  canonicalPropId: string;
};

export function nestedPublishSeedPairKey(pair: NestedPublishSeedPair): string {
  return `${pair.nestedPropId.toLowerCase()}|${pair.canonicalPropId.toLowerCase()}`;
}

/** Record nested prop ids tagged inside a nested component definition (not the root slot component). */
export function collectNestedPublishSeedPairsFromBinding(
  boundPropId: string,
  canonicalPropId: string,
  nestedDepth: number
): NestedPublishSeedPair | null {
  if (nestedDepth <= 0 || boundPropId === canonicalPropId) {
    return null;
  }
  return { nestedPropId: boundPropId, canonicalPropId };
}
