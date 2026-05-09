type ElementWithChildren = AnyElement & {
  getChildren: () => Promise<AnyElement[]>;
};

function hasGetChildren(e: AnyElement): e is ElementWithChildren {
  return typeof (e as { getChildren?: unknown }).getChildren === "function";
}

const CMS_SLOT_ENGINE_COMPONENT_IDS_ATTR = "data-beacon-engine-component-ids";
const BEACON_ENGINE_COMPONENT_IDS_EMPTY = "__none__";

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

function serializeBeaconEngineConfiguredComponentIds(componentIds: readonly string[]): string {
  const unique = uniqueComponentIds(componentIds);
  if (unique.length === 0) {
    return BEACON_ENGINE_COMPONENT_IDS_EMPTY;
  }
  return unique.join(",");
}

function parseBeaconEngineConfiguredComponentIds(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed === BEACON_ENGINE_COMPONENT_IDS_EMPTY) {
    return [];
  }
  return uniqueComponentIds(trimmed.split(","));
}

/** Stable key for a beacon list container (page / tree identity). */
export function cmsSlotListKey(container: BlockElement): string {
  return `${container.id.component}:${container.id.element}`;
}

export type CmsSlotListOnPage = {
  /** Value of `data-list`, e.g. `beacon-hero-cta` */
  dataList: string;
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
        out.push({ dataList: list, container: block, key: cmsSlotListKey(block) });
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
};

/** Engine-configured component ids for this beacon list, or `null` when not configured yet. */
export async function readCmsSlotEngineConfiguredComponentIds(container: BlockElement): Promise<string[] | null> {
  const raw = await container.getCustomAttribute(CMS_SLOT_ENGINE_COMPONENT_IDS_ATTR);
  if (raw == null) {
    return null;
  }
  return parseBeaconEngineConfiguredComponentIds(raw);
}

/** Persists the Engine-configured component ids for this beacon list. */
export async function writeCmsSlotEngineConfiguredComponentIds(
  container: BlockElement,
  componentIds: readonly string[]
): Promise<void> {
  await container.setCustomAttribute(
    CMS_SLOT_ENGINE_COMPONENT_IDS_ATTR,
    serializeBeaconEngineConfiguredComponentIds(componentIds)
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
 * Returns Engine-configured component ids for this beacon list. Falls back to the current target rows
 * when this beacon was created before that config attribute existed.
 */
export async function resolveCmsSlotEngineConfiguredComponentIds(
  container: BlockElement,
  rows: HydratedCmsSlotRow[]
): Promise<string[]> {
  const configured = await readCmsSlotEngineConfiguredComponentIds(container);
  if (configured != null) {
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
  for (const ch of children) {
    if (ch.type !== "ComponentInstance") continue;
    const inst = ch as ComponentElement;
    const comp = await inst.getComponent();
    const name = await comp.getName();
    out.push({ key: crypto.randomUUID(), componentId: comp.id, name, instance: inst });
  }
  return out;
}
