import { cachedComponentName, seedCachedComponent } from "@/features/cms-slots/model/cms-slot-component-def-cache";
import { readCmsSlotListDisplayName } from "@/features/cms-slots/model/cms-slot-data-list-display";
import {
  type CmsSlotSelectedVariant,
  readSelectedVariantFromInstanceProps,
} from "@/features/cms-slots/model/cms-slot-instance-variant";
import { dedupePoolOptionKeys, poolOptionKey } from "@/features/cms-slots/model/cms-slot-pool-option";

type ElementWithChildren = AnyElement & {
  getChildren: () => Promise<AnyElement[]>;
};

function hasGetChildren(e: AnyElement): e is ElementWithChildren {
  return typeof (e as { getChildren?: unknown }).getChildren === "function";
}

const CMS_SLOT_DESIGNER_COMPONENT_IDS_ATTR = "data-beacon-designer-component-ids";
/** Pre-rename attribute name; read as a fallback so lists configured before the Engine→Designer rename keep their
 * configured pool keys (the next save rewrites under the current name). See the slot-props file for the same issue. */
const CMS_SLOT_LEGACY_COMPONENT_IDS_ATTR = "data-beacon-engine-component-ids";
const BEACON_DESIGNER_COMPONENT_IDS_EMPTY = "__none__";

/**
 * The configured-ids attribute now stores **pool-option keys** ({@link poolOptionKey}) — `componentId` for a base seed,
 * `componentId~variantId` for a variant-pinned seed. Pre-variant lists stored bare component ids, which decode to base
 * pool keys, so the format is backward compatible (no migration needed).
 */
function serializeBeaconDesignerConfiguredPoolKeys(poolKeys: readonly string[]): string {
  const unique = dedupePoolOptionKeys(poolKeys);
  if (unique.length === 0) {
    return BEACON_DESIGNER_COMPONENT_IDS_EMPTY;
  }
  return unique.join(",");
}

function parseBeaconDesignerConfiguredPoolKeys(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed === BEACON_DESIGNER_COMPONENT_IDS_EMPTY) {
    return [];
  }
  return dedupePoolOptionKeys(trimmed.split(","));
}

/** Stable key for a CMS slot container (page / tree identity). */
export function cmsSlotListKey(container: BlockElement): string {
  return `${container.id.component}:${container.id.element}`;
}

export type CmsSlotListOnPage = {
  /** Value of `data-list`, e.g. `beacon-hero-cta` */
  dataList: string;
  /** User-facing rename label from `data-beacon-display-name`, when set. */
  displayName: string | null;
  container: BlockElement;
  /** Stable key for React / maps */
  key: string;
};

/**
 * Visits the tree in DOM order; collects div blocks with Codalyn beacon target attributes.
 */
export async function findCmsSlotListsOnPage(): Promise<CmsSlotListOnPage[]> {
  const all = await webflow.getAllElements();
  const body = all.find((e) => e.type === "Body");
  if (!body || !hasGetChildren(body)) {
    return [];
  }

  // Collect every Block in DOM (pre-order) order, fetching each level's children concurrently across the tree
  // breadth — a serial DFS pays one Designer bridge round-trip per node in sequence.
  const collectBlocks = async (el: AnyElement): Promise<BlockElement[]> => {
    const here: BlockElement[] = el.type === "Block" ? [el as BlockElement] : [];
    if (!hasGetChildren(el)) {
      return here;
    }
    const children = await el.getChildren();
    const childBlocks = await Promise.all(children.map(collectBlocks));
    for (const group of childBlocks) {
      here.push(...group);
    }
    return here;
  };
  const blocks = await collectBlocks(body);

  // Read target/list (and the display name for matches) for every candidate block in parallel.
  const rows = await Promise.all(
    blocks.map(async (block): Promise<CmsSlotListOnPage | null> => {
      const [target, list] = await Promise.all([
        block.getCustomAttribute("data-target"),
        block.getCustomAttribute("data-list"),
      ]);
      if (target !== "beacons" || list == null || !list.startsWith("beacon-")) {
        return null;
      }
      const displayName = await readCmsSlotListDisplayName(block);
      return { dataList: list, displayName, container: block, key: cmsSlotListKey(block) };
    })
  );
  return rows.filter((row): row is CmsSlotListOnPage => row != null);
}

export type HydratedCmsSlotRow = {
  key: string;
  componentId: string;
  name: string;
  instance: ComponentElement;
  /** Index in `container.getChildren()` — matches published `sourceNode.children` for runtime clone `i[]`. */
  domChildIndex: number;
  /** Variant this seed is pinned to (read from its instance props), or `null` for the base/no-variant seed. */
  variant: CmsSlotSelectedVariant | null;
  /** Stable pool-option key (`componentId` + pinned variant) — pool/palette/draft identity. */
  poolKey: string;
};

/** Designer-configured pool keys for this CMS slot, or `null` when not configured yet. */
export async function readCmsSlotDesignerConfiguredPoolKeys(container: BlockElement): Promise<string[] | null> {
  const current = await container.getCustomAttribute(CMS_SLOT_DESIGNER_COMPONENT_IDS_ATTR);
  const raw =
    current != null && current.trim().length > 0
      ? current
      : await container.getCustomAttribute(CMS_SLOT_LEGACY_COMPONENT_IDS_ATTR);
  if (raw == null) {
    return null;
  }
  return parseBeaconDesignerConfiguredPoolKeys(raw);
}

/** Persists the Designer-configured pool keys (component + pinned variant) for this CMS slot. */
export async function writeCmsSlotDesignerConfiguredPoolKeys(
  container: BlockElement,
  poolKeys: readonly string[]
): Promise<void> {
  await container.setCustomAttribute(
    CMS_SLOT_DESIGNER_COMPONENT_IDS_ATTR,
    serializeBeaconDesignerConfiguredPoolKeys(poolKeys)
  );
}

/** Keeps only rows whose pool key is in `allowedPoolKeys` (in original row order). */
export function filterHydratedCmsSlotRowsByPoolKeys(
  rows: HydratedCmsSlotRow[],
  allowedPoolKeys: readonly string[]
): HydratedCmsSlotRow[] {
  if (allowedPoolKeys.length === 0) {
    return [];
  }
  const allowed = new Set(dedupePoolOptionKeys(allowedPoolKeys));
  return rows.filter((row) => allowed.has(row.poolKey));
}

/**
 * Returns Designer-configured pool keys for this CMS slot. Falls back to pool keys from the current hidden-list
 * instances when the attribute is missing **or** persisted as empty (`__none__` — written on new lists before any slot
 * row exists). Non-empty stored keys always win (Designer palette).
 */
export async function resolveCmsSlotDesignerConfiguredPoolKeys(
  container: BlockElement,
  rows: HydratedCmsSlotRow[]
): Promise<string[]> {
  const configured = await readCmsSlotDesignerConfiguredPoolKeys(container);
  if (configured != null && configured.length > 0) {
    return configured;
  }
  return dedupePoolOptionKeys(rows.map((row) => row.poolKey));
}

/** Reads the variant a seed instance is pinned to; best-effort (`searchProps` can throw on some instances). */
async function readSeedVariant(instance: ComponentElement): Promise<CmsSlotSelectedVariant | null> {
  try {
    return readSelectedVariantFromInstanceProps(await instance.searchProps());
  } catch {
    return null;
  }
}

/**
 * Direct child component instances inside the target, in order (matches our append order).
 */
export async function listInstancesInSlotListContainer(container: BlockElement): Promise<HydratedCmsSlotRow[]> {
  const children = await container.getChildren();
  // Hydrate each component-instance child concurrently — getComponent/getName/searchProps are bridge round-trips, so a
  // serial loop costs N × latency. `domChildIndex` (the original child index) preserves DOM order.
  const rows = await Promise.all(
    children.map(async (ch, domChildIndex): Promise<HydratedCmsSlotRow | null> => {
      if (ch.type !== "ComponentInstance") {
        return null;
      }
      const inst = ch as ComponentElement;
      const comp = await inst.getComponent();
      // Seed the by-id cache so the props-order read in the composer reuses this handle, and dedupe getName across
      // repeated components (a list is often many instances of one component).
      seedCachedComponent(comp);
      const [name, variant] = await Promise.all([cachedComponentName(comp), readSeedVariant(inst)]);
      return {
        key: crypto.randomUUID(),
        componentId: comp.id,
        name,
        instance: inst,
        domChildIndex,
        variant,
        poolKey: poolOptionKey({ componentId: comp.id, variantId: variant?.variantId ?? null }),
      };
    })
  );
  return rows.filter((row): row is HydratedCmsSlotRow => row != null);
}

/** Resolves a published runtime clone index (`payload.i[]`) to the matching Designer pool row. */
export function designerRowForRuntimeCloneIndex(
  designerScopedRows: readonly HydratedCmsSlotRow[],
  runtimeIndex: number
): HydratedCmsSlotRow | undefined {
  for (const row of designerScopedRows) {
    if (row.domChildIndex === runtimeIndex) {
      return row;
    }
  }
  return runtimeIndex >= 0 && runtimeIndex < designerScopedRows.length ? designerScopedRows[runtimeIndex] : undefined;
}

export function designerPoolIndexForRuntimeCloneIndex(
  designerScopedRows: ReadonlyArray<{ domChildIndex?: number }>,
  runtimeIndex: number
): number {
  for (let i = 0; i < designerScopedRows.length; i++) {
    if (designerScopedRows[i]?.domChildIndex === runtimeIndex) {
      return i;
    }
  }
  return runtimeIndex >= 0 && runtimeIndex < designerScopedRows.length ? runtimeIndex : -1;
}

export function runtimeCloneIndexForDesignerPoolIndex(
  designerScopedRows: ReadonlyArray<{ domChildIndex?: number }>,
  poolIndex: number
): number {
  return designerScopedRows[poolIndex]?.domChildIndex ?? poolIndex;
}

/** Upper bound for clamping runtime payload `i[]` against published clone sources (DOM child count). */
export function maxHiddenListDomChildIndex(rows: ReadonlyArray<{ domChildIndex: number }>): number {
  let max = -1;
  for (const row of rows) {
    if (row.domChildIndex > max) {
      max = row.domChildIndex;
    }
  }
  return max;
}
