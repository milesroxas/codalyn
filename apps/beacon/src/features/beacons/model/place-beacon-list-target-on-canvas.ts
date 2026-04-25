import { bindBeaconListTargetInstancesToListCmsText } from "@/features/beacons/model/beacon-list-target-cms-text-binding";
import { listBeaconListTargetInstancesOnPage } from "@/features/beacons/model/beacon-list-target-instances-on-page";
import { ensureBeaconListTargetTextProp } from "@/features/beacons/model/beacon-list-target-text-field";
import { getBeaconListTargetComponentOrNull } from "@/features/beacons/model/create-beacon-list-target-component";
import { webflowDesignerErrorCauseTag } from "@/shared/lib/webflow-designer-error";

const MAX_PLACEMENT_EXIT_STEPS = 8;

/**
 * Placing a list-target **instance** runs against the current **page** tree (`getAllElements`, `append` on body,
 * etc.). If the user is still in a **component definition** context ({@link webflow.getCurrentComponent} non-null),
 * exit to the page first — same idea as other beacon helpers (e.g. list-target mirror).
 */
async function ensurePageCanvasForListTargetPlacement(): Promise<void> {
  if (typeof webflow.getCurrentComponent !== "function" || typeof webflow.exitComponent !== "function") {
    return;
  }
  for (let step = 0; step < MAX_PLACEMENT_EXIT_STEPS; step += 1) {
    const current = await webflow.getCurrentComponent();
    if (current == null) {
      return;
    }
    await webflow.exitComponent();
  }
}

/** O(1) per Webflow docs: only elements with `children: true` support append/prepend. */
function hasChildrenFlag(el: AnyElement): el is AnyElement & { append: (c: Component) => Promise<ComponentElement> } {
  return (el as { children?: boolean }).children === true && typeof (el as { append?: unknown }).append === "function";
}

function elementTreeKey(el: AnyElement): string {
  return `${el.id.component}:${el.id.element}`;
}

async function tryAppendComponent(el: AnyElement, comp: Component): Promise<ComponentElement | null> {
  if (!hasChildrenFlag(el)) return null;
  try {
    return (await el.append(comp)) as ComponentElement;
  } catch (e) {
    if (webflowDesignerErrorCauseTag(e) === "InvalidElementPlacement") return null;
    throw e;
  }
}

async function tryAfterComponent(el: AnyElement, comp: Component): Promise<ComponentElement | null> {
  try {
    return (await el.after(comp)) as ComponentElement;
  } catch (e) {
    if (webflowDesignerErrorCauseTag(e) === "InvalidElementPlacement") return null;
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
async function ensureListTargetTextPropForPlace(
  comp: Component,
  dataList: string,
  listContainer: BlockElement
): Promise<void> {
  try {
    await ensureBeaconListTargetTextProp(comp, { dataList, listContainer });
  } catch (e) {
    console.warn("[beacon] ensureBeaconListTargetTextProp (place on canvas):", e);
  }
}

const LIST_TARGET_COMPONENT_MISSING = "No list target component. Create a list target first.";

const PLACEMENT_FAILED =
  "Could not place the list target. Select a valid container in the canvas or try another location.";

/**
 * `append` / `after` need the registration id from {@link createBeaconListTargetComponent} in some projects;
 * `getComponent` by that id can return a handle whose `getProps()` does not list the “Text” field the same way
 * as the definition resolved by name. Keep two handles: placement vs Text prop + CMS bind.
 */
async function resolveListTargetDefAndPlacementDef(
  dataList: string,
  listContainer: BlockElement,
  preferredDefinitionId: string | null | undefined
): Promise<{ resolvedDef: Component; placementDef: Component }> {
  let resolvedDef = await getBeaconListTargetComponentOrNull(dataList, listContainer, preferredDefinitionId);
  if (resolvedDef == null) {
    throw new Error(LIST_TARGET_COMPONENT_MISSING);
  }
  const definitionIdToFetch = preferredDefinitionId?.trim() || resolvedDef.id;
  let placementDef: Component = resolvedDef;
  try {
    placementDef = await webflow.getComponent(definitionIdToFetch);
  } catch (e) {
    if (webflowDesignerErrorCauseTag(e) !== "ResourceMissing") {
      throw e;
    }
    resolvedDef = await getBeaconListTargetComponentOrNull(dataList, listContainer, preferredDefinitionId);
    if (resolvedDef == null) {
      throw new Error(LIST_TARGET_COMPONENT_MISSING);
    }
    try {
      placementDef = await webflow.getComponent(preferredDefinitionId?.trim() || resolvedDef.id);
    } catch (e2) {
      if (webflowDesignerErrorCauseTag(e2) === "ResourceMissing") {
        throw new Error(LIST_TARGET_COMPONENT_MISSING);
      }
      throw e2;
    }
  }
  return { resolvedDef, placementDef };
}

async function tryPlaceNewListTargetInstance(placementDef: Component): Promise<ComponentElement | null> {
  const selected = await webflow.getSelectedElement();
  if (selected) {
    return placeFromSelection(selected, placementDef);
  }
  return placeOnBodyWhenNoSelection(placementDef);
}

/**
 * The “Text” `textContent` prop is ensured **after** placement when this is the first on-page instance:
 * {@link ensureBeaconListTargetTextProp} can `enterComponent` an existing instance; if none exists yet, direct
 * `createProps` on the definition must succeed — running ensure only once an instance is placed makes the
 * instance path reliable. CMS bind runs after so the prop id exists for `setProps`.
 */
function makeListTargetCmsBinder(
  dataList: string,
  listContainer: BlockElement,
  resolvedDef: Component,
  preferredDefinitionId: string | null | undefined
): (priority: ComponentElement | null) => Promise<void> {
  return async (priority: ComponentElement | null): Promise<void> => {
    const allOnPage = await listBeaconListTargetInstancesOnPage(dataList, listContainer, {
      preferredDefinitionId,
    });
    await bindBeaconListTargetInstancesToListCmsText({
      dataList,
      listContainer,
      def: resolvedDef,
      instances: allOnPage,
      priorityInstances: priority != null ? [priority] : undefined,
    });
  };
}

export async function placeBeaconListTargetOnCanvas(
  dataList: string,
  listContainer: BlockElement,
  preferredDefinitionId?: string | null
): Promise<PlaceBeaconListTargetOnCanvasResult> {
  await ensurePageCanvasForListTargetPlacement();
  const { resolvedDef, placementDef } = await resolveListTargetDefAndPlacementDef(
    dataList,
    listContainer,
    preferredDefinitionId
  );
  const bindCms = makeListTargetCmsBinder(dataList, listContainer, resolvedDef, preferredDefinitionId);

  const existing = await listBeaconListTargetInstancesOnPage(dataList, listContainer, {
    preferredDefinitionId,
  });
  const firstExisting = existing[0];
  if (firstExisting != null) {
    await ensureListTargetTextPropForPlace(resolvedDef, dataList, listContainer);
    await bindCms(firstExisting);
    return { instance: firstExisting, alreadyExisted: true };
  }

  const placed = await tryPlaceNewListTargetInstance(placementDef);
  if (placed == null) {
    throw new Error(PLACEMENT_FAILED);
  }
  await ensureListTargetTextPropForPlace(resolvedDef, dataList, listContainer);
  await bindCms(placed);
  return { instance: placed, alreadyExisted: false };
}
