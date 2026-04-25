import { webflowTreeNodeKey } from "@/features/image-editor/lib/webflow-element-id-key";

type WithChildren = { getChildren?: () => Promise<AnyElement[] | null> };

/** Parent in the Webflow page tree: canvas elements, slot instances, etc. */
export type WebflowLayoutParent = AnyElement | SlotInstanceElement;

async function getChildList(node: WithChildren | null | undefined): Promise<AnyElement[]> {
  if (node == null || typeof node.getChildren !== "function") {
    return [];
  }
  const ch = await node.getChildren();
  return ch ?? [];
}

function linkAsChildOf(child: { id: object }, parent: WebflowLayoutParent, parentBy: Map<string, WebflowLayoutParent>) {
  parentBy.set(webflowTreeNodeKey(child), parent);
}

/**
 * Fills the map for everything reachable from a **ComponentInstance**’s public children + **slots**.
 * Relying on the Body walk alone often **skips in-component** nodes, so the Image never gets
 * a parent link and we cannot read a wrapper’s `aspect-ratio` / `max-width` for layout inference.
 */
async function linkComponentInstanceInterior(
  inst: ComponentElement,
  parentBy: Map<string, WebflowLayoutParent>,
  visitFromBody: (el: AnyElement) => Promise<void>
) {
  for (const c of await getChildList(inst as WithChildren)) {
    linkAsChildOf(c, inst, parentBy);
    await visitFromBody(c);
  }
  const slots = await inst.getSlots().catch(() => [] as Awaited<ReturnType<ComponentElement["getSlots"]>>);
  for (const slot of slots) {
    linkAsChildOf(slot, inst, parentBy);
    for (const c of await getChildList(slot as unknown as WithChildren)) {
      linkAsChildOf(c, slot, parentBy);
      await visitFromBody(c);
    }
  }
}

/**
 * `child id key → direct parent` for the current page. Includes **in-component** and **slot** edges
 * so nested Images resolve wrapper `aspect-ratio` / width from parent divs.
 */
export async function buildWebflowParentByChildIdMap(): Promise<Map<string, WebflowLayoutParent> | null> {
  const all = await webflow.getAllElements();
  /** On a page, `Body` exists. Inside a component (after `enterComponent`), the tree has no `Body`; use the component root. */
  const start: AnyElement | null =
    all.find((e) => e.type === "Body") ??
    (await (webflow as { getRootElement?: () => Promise<AnyElement | null> }).getRootElement?.().catch(() => null)) ??
    null;
  if (start == null) {
    return null;
  }
  const w = start as WithChildren;
  if (typeof w.getChildren !== "function") {
    return null;
  }
  const parentBy = new Map<string, WebflowLayoutParent>();
  const visit = async (el: AnyElement) => {
    for (const ch of await getChildList(el as WithChildren)) {
      linkAsChildOf(ch, el, parentBy);
      await visit(ch);
    }
  };
  await visit(start);

  for (const el of all) {
    if (el.type === "ComponentInstance") {
      await linkComponentInstanceInterior(el as ComponentElement, parentBy, visit);
    }
  }
  return parentBy;
}

function hasGetStyles(n: WebflowLayoutParent): n is AnyElement {
  return typeof (n as { getStyles?: unknown }).getStyles === "function";
}

type SlotList = Awaited<ReturnType<ComponentElement["getSlots"]>>;

function isSlotId(id: object): id is { component: string; element: string; slot: string } {
  return typeof (id as { slot?: string }).slot === "string";
}

function idKeyEquals(node: { id: object }, tkey: string): boolean {
  return webflowTreeNodeKey(node) === tkey;
}

async function getInstanceSlotsEmptyOnError(inst: ComponentElement): Promise<SlotList> {
  return (await inst.getSlots().catch(() => [] as SlotList)) as SlotList;
}

async function findParentAmongElementsChildren(tkey: string, all: AnyElement[]): Promise<WebflowLayoutParent | null> {
  for (const el of all) {
    for (const c of await getChildList(el as WithChildren)) {
      if (idKeyEquals(c, tkey)) {
        return el;
      }
    }
  }
  return null;
}

async function findParentAmongSlotChildren(tkey: string, all: AnyElement[]): Promise<WebflowLayoutParent | null> {
  for (const el of all) {
    if (el.type !== "ComponentInstance") {
      continue;
    }
    for (const slot of await getInstanceSlotsEmptyOnError(el as ComponentElement)) {
      for (const c of await getChildList(slot as unknown as WithChildren)) {
        if (idKeyEquals(c, tkey)) {
          return slot;
        }
      }
    }
  }
  return null;
}

async function findParentInPageTree(tkey: string, all: AnyElement[]): Promise<WebflowLayoutParent | null> {
  return (await findParentAmongElementsChildren(tkey, all)) ?? (await findParentAmongSlotChildren(tkey, all));
}

async function findComponentForSlotNode(tkey: string, all: AnyElement[]): Promise<ComponentElement | null> {
  for (const el of all) {
    if (el.type !== "ComponentInstance") {
      continue;
    }
    for (const s of await getInstanceSlotsEmptyOnError(el as ComponentElement)) {
      if (idKeyEquals(s, tkey)) {
        return el as ComponentElement;
      }
    }
  }
  return null;
}

/**
 * When the pre-built `parent` map is missing an edge, find the direct parent by scanning
 * `getAllElements` plus each `ComponentInstance`’s `getSlots` (slot children are not always
 * covered by a single `getChildren` pass from `getAllElements`).
 */
async function findDirectParentByTreeScan(child: WebflowLayoutParent): Promise<WebflowLayoutParent | null> {
  const tkey = webflowTreeNodeKey(child as { id: object });
  const all = await webflow.getAllElements();
  const fromTree = await findParentInPageTree(tkey, all);
  if (fromTree != null) {
    return fromTree;
  }
  if (isSlotId((child as { id: object }).id)) {
    return findComponentForSlotNode(tkey, all);
  }
  return null;
}

/**
 * Walk from `from` up to `max` logical parents. Uses the map, then a **tree scan** when an edge
 * is missing (some Designer trees omit links the Body DFS never records).
 */
export async function getAncestorLayoutChain(
  from: AnyElement,
  max: number,
  parentByChildId: Map<string, WebflowLayoutParent>
): Promise<WebflowLayoutParent[]> {
  const out: WebflowLayoutParent[] = [];
  let cur: WebflowLayoutParent | undefined = from;
  for (let i = 0; i < max; i += 1) {
    if (cur == null) {
      break;
    }
    const keyCur = webflowTreeNodeKey(cur as { id: object });
    const fromMap = parentByChildId.get(keyCur);
    const nextParent: WebflowLayoutParent | null = fromMap ?? (await findDirectParentByTreeScan(cur));
    if (nextParent == null) {
      break;
    }
    linkAsChildOf(cur as { id: object }, nextParent, parentByChildId);
    out.push(nextParent);
    cur = nextParent;
  }
  return out;
}

/**
 * Ancestors that support `getStyles` (used to merge `aspect-ratio`, width, etc.).
 * Non-style nodes (e.g. slot instance) are skipped, but the **graph** still links images to
 * wrapper divs **above** the slot so those divs appear in this list in the correct order.
 */
export async function getLayoutAncestorsForStyleRead(
  from: AnyElement,
  max: number,
  parentByChildId: Map<string, WebflowLayoutParent>
): Promise<AnyElement[]> {
  return (await getAncestorLayoutChain(from, max, parentByChildId)).filter(hasGetStyles);
}
