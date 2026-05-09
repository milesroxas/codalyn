import type {
  ComposableInstancePropMeta,
  ComposableInstancePropSelectOption,
} from "@/features/cms-slots/model/cms-slot-composable-props";

const ATTR = "data-beacon-engine-slot-props";
const FILE_VERSION = 1 as const;

export type CmsSlotEngineSlotEntry = { exposed: ComposableInstancePropMeta[] };

export type CmsSlotEngineSlotPropsFile = {
  v: typeof FILE_VERSION;
  slots: CmsSlotEngineSlotEntry[];
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function isSelectOption(x: unknown): x is ComposableInstancePropSelectOption {
  if (!isRecord(x)) {
    return false;
  }
  return typeof x.value === "string" && typeof x.label === "string" && x.value.length > 0;
}

function isComposableMeta(x: unknown): x is ComposableInstancePropMeta {
  if (!isRecord(x)) {
    return false;
  }
  if (
    typeof x.propId !== "string" ||
    typeof x.label !== "string" ||
    typeof x.valueType !== "string" ||
    x.propId.length === 0
  ) {
    return false;
  }
  const so = (x as { selectOptions?: unknown }).selectOptions;
  if (so === undefined) {
    return true;
  }
  if (!Array.isArray(so) || so.some((o) => !isSelectOption(o))) {
    return false;
  }
  return true;
}

function parseFile(raw: string | null | undefined, slotCount: number): CmsSlotEngineSlotPropsFile {
  const t = (raw ?? "").trim();
  if (t.length === 0) {
    return { v: FILE_VERSION, slots: Array.from({ length: slotCount }, () => ({ exposed: [] })) };
  }
  let u: unknown;
  try {
    u = JSON.parse(t) as unknown;
  } catch {
    return { v: FILE_VERSION, slots: Array.from({ length: slotCount }, () => ({ exposed: [] })) };
  }
  if (!isRecord(u) || u.v !== FILE_VERSION || !Array.isArray(u.slots)) {
    return { v: FILE_VERSION, slots: Array.from({ length: slotCount }, () => ({ exposed: [] })) };
  }
  const slots: CmsSlotEngineSlotEntry[] = [];
  for (let i = 0; i < slotCount; i++) {
    const s = u.slots[i];
    if (!isRecord(s) || !Array.isArray(s.exposed)) {
      slots.push({ exposed: [] });
      continue;
    }
    const exposed: ComposableInstancePropMeta[] = [];
    const byId = new Set<string>();
    for (const m of s.exposed) {
      if (isComposableMeta(m) && !byId.has(m.propId)) {
        byId.add(m.propId);
        exposed.push(m);
      }
    }
    slots.push({ exposed });
  }
  return { v: FILE_VERSION, slots };
}

export function serializeSlotPropsFile(f: CmsSlotEngineSlotPropsFile): string {
  return JSON.stringify(f satisfies CmsSlotEngineSlotPropsFile);
}

function findOldPoolIndexForRow(
  oldPool: readonly { componentId: string; exposed: ComposableInstancePropMeta[] }[],
  componentId: string,
  used: Set<number>
): number {
  for (let i = 0; i < oldPool.length; i++) {
    if (used.has(i)) {
      continue;
    }
    if (oldPool[i].componentId === componentId) {
      return i;
    }
  }
  for (let i = 0; i < oldPool.length; i++) {
    if (oldPool[i].componentId === componentId) {
      return i;
    }
  }
  return -1;
}

/**
 * @param poolComponentIds — component id per hidden list slot, in child order; used to realign on rebuild.
 */
export function realignExposedByPoolOrder(
  oldPool: readonly { componentId: string; exposed: ComposableInstancePropMeta[] }[],
  newPool: readonly { componentId: string }[]
): CmsSlotEngineSlotEntry[] {
  const used = new Set<number>();
  return newPool.map((row) => {
    const found = findOldPoolIndexForRow(oldPool, row.componentId, used);
    if (found < 0) {
      return { exposed: [] };
    }
    used.add(found);
    return { exposed: oldPool[found].exposed.map((e) => ({ ...e })) };
  });
}

/**
 * Merges stored slot data with the current child count; trims or pads `slots` as needed.
 */
export async function readCmsSlotEngineSlotPropsFile(
  listContainer: BlockElement,
  slotCount: number
): Promise<CmsSlotEngineSlotPropsFile> {
  const raw = await listContainer.getCustomAttribute(ATTR);
  return parseFile(raw ?? null, Math.max(0, slotCount));
}

export async function writeCmsSlotEngineSlotPropsFile(
  listContainer: BlockElement,
  file: CmsSlotEngineSlotPropsFile
): Promise<void> {
  await listContainer.setCustomAttribute(ATTR, serializeSlotPropsFile(file));
}

/**
 * @param oldPoolIds — one component id per slot **before** canvas rebuild.
 * @param newPool — component ids in order after rebuild.
 * @param oldFile — slot file **before** rebuild (aligned with `oldPoolIds`).
 */
export function mergeSlotFileAfterListRebuild(
  oldPoolIds: readonly string[],
  oldFile: CmsSlotEngineSlotPropsFile,
  newPool: readonly { componentId: string }[]
): CmsSlotEngineSlotPropsFile {
  const oldCombined = oldPoolIds.map((componentId, i) => ({
    componentId,
    exposed: oldFile.slots[i]?.exposed ?? [],
  }));
  const nextSlots = realignExposedByPoolOrder(oldCombined, newPool);
  return { v: FILE_VERSION, slots: nextSlots };
}
