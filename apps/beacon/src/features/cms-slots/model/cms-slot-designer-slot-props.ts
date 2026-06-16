import type {
  ComposableInstancePropMeta,
  ComposableInstancePropSelectOption,
} from "@/features/cms-slots/model/cms-slot-composable-props";

const ATTR = "data-beacon-designer-slot-props";
/**
 * Pre-rename attribute name. The Engine→Designer rename changed the persisted attribute but shipped no migration,
 * so lists configured before it stored their exposed-props config here. Read it as a fallback (the next save rewrites
 * the value under {@link ATTR}); without this, pre-rename lists silently lose all exposed props and the runtime
 * payload saves with empty content.
 */
const LEGACY_ATTR = "data-beacon-engine-slot-props";
const FILE_VERSION = 1 as const;

async function readSlotPropsAttrRaw(container: BlockElement): Promise<string | null> {
  const current = await container.getCustomAttribute(ATTR);
  if (current != null && current.trim().length > 0) {
    return current;
  }
  return container.getCustomAttribute(LEGACY_ATTR);
}

export type CmsSlotDesignerSlotEntry = { exposed: ComposableInstancePropMeta[] };

export type CmsSlotDesignerSlotPropsFile = {
  v: typeof FILE_VERSION;
  slots: CmsSlotDesignerSlotEntry[];
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

/**
 * Webflow `setCustomAttribute` rejects values containing double quotes, so the slot-props JSON is base64-encoded on
 * write and decoded on read. A raw `{...}` JSON value is still accepted so anything written before encoding keeps
 * parsing; an undecodable value falls through to the empty-file default.
 */
function encodeSlotPropsAttrValue(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decodeSlotPropsAttrValue(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (t.length === 0 || t.startsWith("{")) {
    return t;
  }
  try {
    const binary = atob(t);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return t;
  }
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

function parseFile(raw: string | null | undefined, slotCount: number): CmsSlotDesignerSlotPropsFile {
  const t = decodeSlotPropsAttrValue(raw);
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
  const slots: CmsSlotDesignerSlotEntry[] = [];
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

export function serializeSlotPropsFile(f: CmsSlotDesignerSlotPropsFile): string {
  return encodeSlotPropsAttrValue(JSON.stringify(f satisfies CmsSlotDesignerSlotPropsFile));
}

/**
 * Every exposed prop id stored in a slot-props file string, across **all** slots (no slot-count trimming).
 * Used to gather a CMS slot's owned `data-cb-c` prop ids so a shared nested component definition keeps that
 * slot's segments when a **different** slot on the same page re-tags it.
 */
export function collectExposedPropIdsFromSlotFileRaw(raw: string | null | undefined): string[] {
  const t = decodeSlotPropsAttrValue(raw);
  if (t.length === 0) {
    return [];
  }
  let u: unknown;
  try {
    u = JSON.parse(t) as unknown;
  } catch {
    return [];
  }
  if (!isRecord(u) || u.v !== FILE_VERSION || !Array.isArray(u.slots)) {
    return [];
  }
  const out = new Set<string>();
  for (const s of u.slots) {
    if (!isRecord(s) || !Array.isArray(s.exposed)) {
      continue;
    }
    for (const m of s.exposed) {
      if (isComposableMeta(m)) {
        out.add(m.propId);
      }
    }
  }
  return [...out];
}

/** Reads {@link collectExposedPropIdsFromSlotFileRaw} for one CMS slot container. */
export async function readAllExposedPropIdsForContainer(container: BlockElement): Promise<string[]> {
  return collectExposedPropIdsFromSlotFileRaw(await readSlotPropsAttrRaw(container));
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
function realignExposedByPoolOrder(
  oldPool: readonly { componentId: string; exposed: ComposableInstancePropMeta[] }[],
  newPool: readonly { componentId: string }[]
): CmsSlotDesignerSlotEntry[] {
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
export async function readCmsSlotDesignerSlotPropsFile(
  listContainer: BlockElement,
  slotCount: number
): Promise<CmsSlotDesignerSlotPropsFile> {
  const raw = await readSlotPropsAttrRaw(listContainer);
  return parseFile(raw ?? null, Math.max(0, slotCount));
}

export async function writeCmsSlotDesignerSlotPropsFile(
  listContainer: BlockElement,
  file: CmsSlotDesignerSlotPropsFile
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
  oldFile: CmsSlotDesignerSlotPropsFile,
  newPool: readonly { componentId: string }[]
): CmsSlotDesignerSlotPropsFile {
  const oldCombined = oldPoolIds.map((componentId, i) => ({
    componentId,
    exposed: oldFile.slots[i]?.exposed ?? [],
  }));
  const nextSlots = realignExposedByPoolOrder(oldCombined, newPool);
  return { v: FILE_VERSION, slots: nextSlots };
}
