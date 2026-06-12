import { readCmsSlotListDisplayName } from "@/features/cms-slots/model/cms-slot-data-list-display";

type ElementWithChildren = AnyElement & {
  getChildren: () => Promise<AnyElement[]>;
};

function hasGetChildren(e: AnyElement): e is ElementWithChildren {
  return typeof (e as { getChildren?: unknown }).getChildren === "function";
}

const CMS_SLOT_DESIGNER_COMPONENT_IDS_ATTR = "data-beacon-designer-component-ids";
const BEACON_DESIGNER_COMPONENT_IDS_EMPTY = "__none__";

function uniqueComponentIds(componentIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const componentId of componentIds) {
    const trimmed = componentId.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function serializeBeaconDesignerConfiguredComponentIds(componentIds: readonly string[]): string {
  const unique = uniqueComponentIds(componentIds);
  if (unique.length === 0) {
    return BEACON_DESIGNER_COMPONENT_IDS_EMPTY;
  }
  return unique.join(",");
}

function parseBeaconDesignerConfiguredComponentIds(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed === BEACON_DESIGNER_COMPONENT_IDS_EMPTY) {
    return [];
  }
  return uniqueComponentIds(trimmed.split(","));
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

  const out: CmsSlotListOnPage[] = [];

  const visit = async (el: AnyElement) => {
    if (el.type === "Block") {
      const block = el as BlockElement;
      const target = await block.getCustomAttribute("data-target");
      const list = await block.getCustomAttribute("data-list");
      if (target === "beacons" && list != null && list.startsWith("beacon-")) {
        const displayName = await readCmsSlotListDisplayName(block);
        out.push({ dataList: list, displayName, container: block, key: cmsSlotListKey(block) });
      }
    }
    if (!hasGetChildren(el)) return;
    const children = await el.getChildren();
    for (const c of children) {
      await visit(c);
    }
  };

  await visit(body);
  return out;
}

export type HydratedCmsSlotRow = {
  key: string;
  componentId: string;
  name: string;
  instance: ComponentElement;
  /** Index in `container.getChildren()` — matches published `sourceNode.children` for runtime clone `i[]`. */
  domChildIndex: number;
};

/** Designer-configured component ids for this CMS slot, or `null` when not configured yet. */
export async function readCmsSlotDesignerConfiguredComponentIds(container: BlockElement): Promise<string[] | null> {
  const raw = await container.getCustomAttribute(CMS_SLOT_DESIGNER_COMPONENT_IDS_ATTR);
  if (raw == null) {
    return null;
  }
  return parseBeaconDesignerConfiguredComponentIds(raw);
}

/** Persists the Designer-configured component ids for this CMS slot. */
export async function writeCmsSlotDesignerConfiguredComponentIds(
  container: BlockElement,
  componentIds: readonly string[]
): Promise<void> {
  await container.setCustomAttribute(
    CMS_SLOT_DESIGNER_COMPONENT_IDS_ATTR,
    serializeBeaconDesignerConfiguredComponentIds(componentIds)
  );
}

/** Keeps only rows whose component id is in `allowedComponentIds` (in original row order). */
export function filterHydratedCmsSlotRowsByComponentIds(
  rows: HydratedCmsSlotRow[],
  allowedComponentIds: readonly string[]
): HydratedCmsSlotRow[] {
  if (allowedComponentIds.length === 0) {
    return [];
  }
  const allowed = new Set(uniqueComponentIds(allowedComponentIds));
  return rows.filter((row) => allowed.has(row.componentId));
}

/**
 * Returns Designer-configured component ids for this CMS slot. Falls back to component ids from the
 * current hidden-list instances when the attribute is missing **or** persisted as empty (`__none__` —
 * written on new lists before any slot row exists). Non-empty stored ids always win (Designer palette).
 */
export async function resolveCmsSlotDesignerConfiguredComponentIds(
  container: BlockElement,
  rows: HydratedCmsSlotRow[]
): Promise<string[]> {
  const configured = await readCmsSlotDesignerConfiguredComponentIds(container);
  if (configured != null && configured.length > 0) {
    return configured;
  }
  return uniqueComponentIds(rows.map((row) => row.componentId));
}

/**
 * Direct child component instances inside the target, in order (matches our append order).
 */
export async function listInstancesInSlotListContainer(container: BlockElement): Promise<HydratedCmsSlotRow[]> {
  const children = await container.getChildren();
  const out: HydratedCmsSlotRow[] = [];
  for (let domChildIndex = 0; domChildIndex < children.length; domChildIndex++) {
    const ch = children[domChildIndex];
    if (ch.type !== "ComponentInstance") continue;
    const inst = ch as ComponentElement;
    const comp = await inst.getComponent();
    const name = await comp.getName();
    out.push({ key: crypto.randomUUID(), componentId: comp.id, name, instance: inst, domChildIndex });
  }
  return out;
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
