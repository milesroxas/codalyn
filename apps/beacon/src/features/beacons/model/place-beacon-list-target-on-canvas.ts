import { listBeaconListTargetInstancesOnPage } from "@/features/beacons/model/beacon-list-target-instances-on-page";
import { getBeaconListTargetComponentOrNull } from "@/features/beacons/model/create-beacon-list-target-component";

/** O(1) per Webflow docs: only elements with `children: true` support append/prepend. */
function hasChildrenFlag(el: AnyElement): el is AnyElement & { append: (c: Component) => Promise<ComponentElement> } {
  return (el as { children?: boolean }).children === true && typeof (el as { append?: unknown }).append === "function";
}

function elementTreeKey(el: AnyElement): string {
  return `${el.id.component}:${el.id.element}`;
}

function designerErrorTag(err: unknown): string | undefined {
  const t = (err as { cause?: { tag?: string } } | null | undefined)?.cause?.tag;
  return typeof t === "string" ? t : undefined;
}

async function tryAppendComponent(el: AnyElement, comp: Component): Promise<ComponentElement | null> {
  if (!hasChildrenFlag(el)) return null;
  try {
    return (await el.append(comp)) as ComponentElement;
  } catch (e) {
    if (designerErrorTag(e) === "InvalidElementPlacement") return null;
    throw e;
  }
}

async function tryAfterComponent(el: AnyElement, comp: Component): Promise<ComponentElement | null> {
  try {
    return (await el.after(comp)) as ComponentElement;
  } catch (e) {
    if (designerErrorTag(e) === "InvalidElementPlacement") return null;
    throw e;
  }
}

type ParentByChild = Map<string, AnyElement>;

async function buildBodyAndParentMap(): Promise<{
  body: AnyElement;
  parentByChild: ParentByChild;
} | null> {
  const all = await webflow.getAllElements();
  const body = all.find((e) => e.type === "Body");
  if (body == null) {
    return null;
  }
  if (typeof (body as { getChildren?: unknown }).getChildren !== "function") {
    return { body, parentByChild: new Map() };
  }

  const parentByChild: ParentByChild = new Map();

  const visit = async (node: AnyElement) => {
    if (typeof (node as { getChildren?: unknown }).getChildren !== "function") return;
    const children = await (node as { getChildren: () => Promise<AnyElement[]> }).getChildren();
    for (const child of children) {
      parentByChild.set(elementTreeKey(child), node);
      await visit(child);
    }
  };
  await visit(body);
  return { body, parentByChild };
}

/**
 * Yields the parent of `start`, then the grandparent, up to the document body
 * (any element that is a key in the parent map).
 */
function* iterateAncestorsFromParent(
  start: AnyElement,
  parentByChild: ParentByChild
): Generator<AnyElement, void, undefined> {
  let cur: AnyElement | undefined = parentByChild.get(elementTreeKey(start));
  const seen = new Set<string>();
  while (cur) {
    const k = elementTreeKey(cur);
    if (seen.has(k)) break;
    seen.add(k);
    yield cur;
    cur = parentByChild.get(k);
  }
}

async function placeFromSelection(selected: AnyElement, comp: Component): Promise<ComponentElement | null> {
  const inSelection = await tryAppendComponent(selected, comp);
  if (inSelection) return inSelection;

  const afterSelection = await tryAfterComponent(selected, comp);
  if (afterSelection) return afterSelection;

  const mapped = await buildBodyAndParentMap();
  if (!mapped) {
    return null;
  }
  for (const ancestor of iterateAncestorsFromParent(selected, mapped.parentByChild)) {
    const inAncestor = await tryAppendComponent(ancestor, comp);
    if (inAncestor) return inAncestor;
  }
  return tryAppendComponent(mapped.body, comp);
}

async function placeOnBodyWhenNoSelection(comp: Component): Promise<ComponentElement | null> {
  const mapped = await buildBodyAndParentMap();
  if (!mapped) {
    return null;
  }
  return tryAppendComponent(mapped.body, comp);
}

export type PlaceBeaconListTargetOnCanvasResult = {
  instance: ComponentElement;
  /** `true` when a list target was already on the page; no new node was created. */
  alreadyExisted: boolean;
};

/**
 * Ensures a single list-target instance: if one (or more) already exists on the current page, returns the
 * first in tree order and does **not** add another. Otherwise adds a new instance using the current selection
 * (append, sibling, ancestor, or body) — same placement rules as before.
 */
export async function placeBeaconListTargetOnCanvas(
  dataList: string,
  listContainer: BlockElement
): Promise<PlaceBeaconListTargetOnCanvasResult> {
  const comp = await getBeaconListTargetComponentOrNull(dataList, listContainer);
  if (comp == null) {
    throw new Error("No list target component. Create a list target first.");
  }

  const existing = await listBeaconListTargetInstancesOnPage(dataList, listContainer);
  const firstExisting = existing[0];
  if (firstExisting != null) {
    return { instance: firstExisting, alreadyExisted: true };
  }

  const selected = await webflow.getSelectedElement();
  if (selected) {
    const fromSelection = await placeFromSelection(selected, comp);
    if (fromSelection) {
      return { instance: fromSelection, alreadyExisted: false };
    }
  } else {
    const onBody = await placeOnBodyWhenNoSelection(comp);
    if (onBody) {
      return { instance: onBody, alreadyExisted: false };
    }
  }

  throw new Error("Could not place the list target. Select a valid container in the canvas or try another location.");
}
