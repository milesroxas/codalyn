type ElementWithChildren = AnyElement & {
  getChildren: () => Promise<AnyElement[]>;
};

function hasGetChildren(e: AnyElement): e is ElementWithChildren {
  return typeof (e as { getChildren?: unknown }).getChildren === "function";
}

/** Stable key for a beacon list container (page / tree identity). */
export function beaconTargetKey(container: BlockElement): string {
  return `${container.id.component}:${container.id.element}`;
}

export type BeaconOnPage = {
  /** Value of `data-list`, e.g. `beacon-hero-cta` */
  dataList: string;
  container: BlockElement;
  /** Stable key for React / maps */
  key: string;
};

/**
 * Visits the tree in DOM order; collects div blocks with Codalyn beacon target attributes.
 */
export async function findBeaconTargetsOnPage(): Promise<BeaconOnPage[]> {
  const all = await webflow.getAllElements();
  const body = all.find((e) => e.type === "Body");
  if (!body || !hasGetChildren(body)) {
    return [];
  }

  const out: BeaconOnPage[] = [];

  const visit = async (el: AnyElement) => {
    if (el.type === "Block") {
      const block = el as BlockElement;
      const target = await block.getCustomAttribute("data-target");
      const list = await block.getCustomAttribute("data-list");
      if (target === "beacons" && list != null && list.startsWith("beacon-")) {
        out.push({ dataList: list, container: block, key: beaconTargetKey(block) });
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

export type HydratedBeaconComponent = {
  key: string;
  componentId: string;
  name: string;
  instance: ComponentElement;
};

/**
 * Direct child component instances inside the target, in order (matches our append order).
 */
export async function listInstancesInBeaconTarget(container: BlockElement): Promise<HydratedBeaconComponent[]> {
  const children = await container.getChildren();
  const out: HydratedBeaconComponent[] = [];
  for (const ch of children) {
    if (ch.type !== "ComponentInstance") continue;
    const inst = ch as ComponentElement;
    const comp = await inst.getComponent();
    const name = await comp.getName();
    out.push({ key: crypto.randomUUID(), componentId: comp.id, name, instance: inst });
  }
  return out;
}
