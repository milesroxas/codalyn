import {
  bindCmsSlotListTargetInstancesToListCmsText,
  type CmsSlotListCmsBinding,
  type CmsSlotListCmsTextFieldEnsureResult,
  ensureCmsSlotListCmsTextFieldOnList,
} from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import { applyCmsSlotListTargetDesignerPlaceholderForList } from "@/features/cms-slots/model/cms-slot-list-target-designer-placeholder";
import { listCmsSlotListTargetInstancesOnPage } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import { ensureCmsSlotListTargetTextProp } from "@/features/cms-slots/model/cms-slot-list-target-text-field";
import { getCmsSlotListTargetComponentOrNull } from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import { findCmsSlotsWrapperOnPage } from "@/features/cms-slots/model/install-cms-slots-wrapper";
import {
  CMS_SLOTS_ROUTE_TASK_CHECKING_CMS_FIELD,
  CMS_SLOTS_ROUTE_TASK_FINISHING,
  CMS_SLOTS_ROUTE_TASK_LINKING_CMS_FIELD,
  CMS_SLOTS_ROUTE_TASK_OPENING_LIST_TARGET,
  CMS_SLOTS_ROUTE_TASK_PLACING_ON_CANVAS,
} from "@/shared/lib/cms-slots-feature-copy";
import { webflowDesignerErrorCauseTag } from "@/shared/lib/webflow-designer-error";

const MAX_EXIT_COMPONENT_STEPS = 4;

const LIST_TARGET_COMPONENT_MISSING = "No list target component. Create a list target first.";
const PLACEMENT_FAILED =
  "Could not place the list target. Select a valid container in the canvas or try another location.";

/** If Webflow Designer never settles CMS `setProps` / polls, unblock placement + UI (see bind below). */
const CMS_BIND_HARD_TIMEOUT_MS = 45_000;

const PLACE_LIST_TARGET_LOG_PREFIX = "[beacon place list target]";

/**
 * `append` / `after` need page-level context — exit any open component edit before placing.
 */
async function exitToPageCanvas(): Promise<void> {
  if (typeof webflow.getCurrentComponent !== "function" || typeof webflow.exitComponent !== "function") {
    return;
  }
  for (let step = 0; step < MAX_EXIT_COMPONENT_STEPS; step += 1) {
    const current = await webflow.getCurrentComponent().catch(() => null);
    if (current == null) {
      return;
    }
    await webflow.exitComponent().catch(() => undefined);
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

async function buildBodyAndParentMap(): Promise<{ body: AnyElement; parentByChild: ParentByChild } | null> {
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

function isDescendantOfElement(element: AnyElement, ancestor: AnyElement, parentByChild: ParentByChild): boolean {
  const ancestorKey = elementTreeKey(ancestor);
  const seen = new Set<string>();
  let cur: AnyElement | undefined = element;
  while (cur) {
    const k = elementTreeKey(cur);
    if (k === ancestorKey) return true;
    if (seen.has(k)) break;
    seen.add(k);
    cur = parentByChild.get(k);
  }
  return false;
}

/** Appending to the wrapper or any of its descendants places the list target inside the hidden install shell. */
function appendParentIsInsideBeaconsWrapper(
  appendParent: AnyElement,
  wrapper: BlockElement | null,
  parentByChild: ParentByChild
): boolean {
  return wrapper != null && isDescendantOfElement(appendParent, wrapper, parentByChild);
}

/** `after` on a strict descendant of the wrapper still inserts inside the hidden install shell. */
function afterSelectionIsInsideBeaconsWrapper(
  selected: AnyElement,
  wrapper: BlockElement | null,
  parentByChild: ParentByChild
): boolean {
  return wrapper != null && selected !== wrapper && isDescendantOfElement(selected, wrapper, parentByChild);
}

async function placeFromSelection(selected: AnyElement, comp: Component): Promise<ComponentElement | null> {
  const [wrapper, mapped] = await Promise.all([findCmsSlotsWrapperOnPage(), buildBodyAndParentMap()]);
  if (!mapped) {
    return null;
  }
  const { body, parentByChild } = mapped;

  if (!appendParentIsInsideBeaconsWrapper(selected, wrapper, parentByChild)) {
    const inSelection = await tryAppendComponent(selected, comp);
    if (inSelection) return inSelection;
  }

  if (!afterSelectionIsInsideBeaconsWrapper(selected, wrapper, parentByChild)) {
    const afterSelection = await tryAfterComponent(selected, comp);
    if (afterSelection) return afterSelection;
  }

  for (const ancestor of iterateAncestorsFromParent(selected, parentByChild)) {
    if (appendParentIsInsideBeaconsWrapper(ancestor, wrapper, parentByChild)) {
      continue;
    }
    const inAncestor = await tryAppendComponent(ancestor, comp);
    if (inAncestor) return inAncestor;
  }
  return tryAppendComponent(body, comp);
}

async function placeOnBodyWhenNoSelection(comp: Component): Promise<ComponentElement | null> {
  const mapped = await buildBodyAndParentMap();
  return mapped == null ? null : tryAppendComponent(mapped.body, comp);
}

export type PlaceCmsSlotListTargetOnCanvasResult = {
  instance: ComponentElement;
  /** `true` when a list target was already on the page; no new node was created. */
  alreadyExisted: boolean;
  cmsFieldWasCreated: boolean;
  cmsBindSucceeded: boolean;
};

export type PlaceCmsSlotListTargetOnCanvasOptions = {
  /** When the caller already ran {@link ensureCmsSlotListCmsTextFieldOnList}, pass the result to skip a second ensure. */
  resolvedCmsEnsure?: CmsSlotListCmsTextFieldEnsureResult | null;
  onProgress?: (message: string) => void;
};

/**
 * `append` / `after` may need the registration id from `createCmsSlotListTargetComponent`; `getComponent` by that id
 * can return a handle whose `getProps()` does not list the Text field the same way as the definition resolved by
 * name. Keep two handles: placement vs Text prop resolution.
 */
async function resolveListTargetDefAndPlacementDef(
  dataList: string,
  listContainer: BlockElement,
  preferredDefinitionId: string | null | undefined
): Promise<{ resolvedDef: Component; placementDef: Component }> {
  const resolvedDef = await getCmsSlotListTargetComponentOrNull(dataList, listContainer, preferredDefinitionId);
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
  }
  return { resolvedDef, placementDef };
}

async function ensureTextPropOnDefs(resolvedDef: Component, placementDef: Component): Promise<void> {
  await ensureCmsSlotListTargetTextProp(resolvedDef);
  if (placementDef.id !== resolvedDef.id) {
    await ensureCmsSlotListTargetTextProp(placementDef);
  }
}

async function tryPlaceNewListTargetInstance(placementDef: Component): Promise<ComponentElement | null> {
  const selected = await webflow.getSelectedElement();
  if (selected) {
    return placeFromSelection(selected, placementDef);
  }
  return placeOnBodyWhenNoSelection(placementDef);
}

/**
 * Force a real component-editor open/close cycle on the placed instance.
 * This nudges Designer to refresh component/cms binding caches before setProps.
 */
async function forceOpenAndCloseListTargetEditor(instance: ComponentElement): Promise<void> {
  if (typeof webflow.enterComponent !== "function" || typeof webflow.exitComponent !== "function") {
    return;
  }
  try {
    await exitToPageCanvas();
    if (typeof webflow.setSelectedElement === "function") {
      try {
        await webflow.setSelectedElement(instance);
      } catch {
        /* selection is optional */
      }
    }
    await webflow.enterComponent(instance);
    await webflow.exitComponent();
  } catch (err) {
    console.warn(
      PLACE_LIST_TARGET_LOG_PREFIX,
      "Could not complete forced component editor cycle before CMS bind:",
      err
    );
    await exitToPageCanvas().catch(() => undefined);
  }
}

async function resolveCmsEnsureForPlacement(
  listContainer: BlockElement,
  dataList: string,
  options?: PlaceCmsSlotListTargetOnCanvasOptions
): Promise<CmsSlotListCmsTextFieldEnsureResult | null> {
  if (options?.resolvedCmsEnsure !== undefined) {
    return options.resolvedCmsEnsure;
  }
  return ensureCmsSlotListCmsTextFieldOnList(listContainer, dataList);
}

function cmsBindFailureMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return String(err);
}

async function tryBindListTargetInstancesToCmsText(params: {
  dataList: string;
  listContainer: BlockElement;
  preferredDefinitionId: string | null | undefined;
  resolvedDef: Component;
  instance: ComponentElement;
  existing: ComponentElement[];
  firstExisting: ComponentElement | undefined;
  cmsBinding: CmsSlotListCmsBinding;
  cmsFieldWasCreated: boolean;
}): Promise<boolean> {
  const onPage =
    params.firstExisting != null
      ? params.existing
      : await listCmsSlotListTargetInstancesOnPage(params.dataList, params.listContainer, {
          preferredDefinitionId: params.preferredDefinitionId,
        });
  try {
    await Promise.race([
      bindCmsSlotListTargetInstancesToListCmsText({
        dataList: params.dataList,
        listContainer: params.listContainer,
        def: params.resolvedDef,
        instances: onPage,
        priorityInstances: [params.instance],
        resolvedBinding: params.cmsBinding,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`CMS Text binding did not finish within ${CMS_BIND_HARD_TIMEOUT_MS / 1000}s.`));
        }, CMS_BIND_HARD_TIMEOUT_MS);
      }),
    ]);
    return true;
  } catch (err) {
    console.warn(PLACE_LIST_TARGET_LOG_PREFIX, "CMS Text bind failed (list target is still on the canvas):", err);
    if (!params.cmsFieldWasCreated) {
      void webflow.notify({
        type: "Warning",
        message: `${cmsBindFailureMessage(err)} Open this beacon again on the collection template to retry syncing the CMS text field.`,
      });
    }
    return false;
  }
}

/**
 * Places (or re-uses) a single list-target instance on the current page and binds its Text prop to the per-list
 * CMS field when available. Ensures the CMS Plain Text field **first** (Data API + Designer schema refresh when
 * newly created), then resolves the component → place / re-use → ensure Text prop → bind. CMS bind is best-effort
 * when the user is not on the matching template page — saving from the template later will bind successfully.
 */
export async function placeCmsSlotListTargetOnCanvas(
  dataList: string,
  listContainer: BlockElement,
  preferredDefinitionId?: string | null,
  options?: PlaceCmsSlotListTargetOnCanvasOptions
): Promise<PlaceCmsSlotListTargetOnCanvasResult> {
  const report = options?.onProgress;
  await exitToPageCanvas();

  if (options?.resolvedCmsEnsure === undefined) {
    report?.(CMS_SLOTS_ROUTE_TASK_CHECKING_CMS_FIELD);
  }
  const cmsEnsure = await resolveCmsEnsureForPlacement(listContainer, dataList, options);
  const cmsBinding: CmsSlotListCmsBinding | null = cmsEnsure?.binding ?? null;
  const cmsFieldWasCreated = cmsEnsure?.fieldWasCreated ?? false;

  const { resolvedDef, placementDef } = await resolveListTargetDefAndPlacementDef(
    dataList,
    listContainer,
    preferredDefinitionId
  );

  report?.(CMS_SLOTS_ROUTE_TASK_PLACING_ON_CANVAS);
  const existing = await listCmsSlotListTargetInstancesOnPage(dataList, listContainer, { preferredDefinitionId });
  const firstExisting = existing[0];
  const instance = firstExisting ?? (await tryPlaceNewListTargetInstance(placementDef));
  if (instance == null) {
    throw new Error(PLACEMENT_FAILED);
  }

  await ensureTextPropOnDefs(resolvedDef, placementDef);
  if (firstExisting == null) {
    report?.(CMS_SLOTS_ROUTE_TASK_OPENING_LIST_TARGET);
    await forceOpenAndCloseListTargetEditor(instance);
  }
  await exitToPageCanvas();

  if (cmsBinding != null) {
    report?.(CMS_SLOTS_ROUTE_TASK_LINKING_CMS_FIELD);
  }
  const cmsBindSucceeded =
    cmsBinding == null
      ? true
      : await tryBindListTargetInstancesToCmsText({
          dataList,
          listContainer,
          preferredDefinitionId,
          resolvedDef,
          instance,
          existing,
          firstExisting,
          cmsBinding,
          cmsFieldWasCreated,
        });

  report?.(CMS_SLOTS_ROUTE_TASK_FINISHING);
  try {
    await applyCmsSlotListTargetDesignerPlaceholderForList(dataList, listContainer, preferredDefinitionId);
  } catch (err) {
    console.warn(PLACE_LIST_TARGET_LOG_PREFIX, "Designer placeholder apply failed:", err);
  }

  return { instance, alreadyExisted: firstExisting != null, cmsFieldWasCreated, cmsBindSucceeded };
}

/** Selects the first list-target instance on the current page (does not create or bind). */
export async function focusCmsSlotListTargetOnCanvas(
  dataList: string,
  listContainer: BlockElement,
  preferredDefinitionId?: string | null
): Promise<ComponentElement | null> {
  await exitToPageCanvas();
  const instances = await listCmsSlotListTargetInstancesOnPage(dataList, listContainer, { preferredDefinitionId });
  const instance = instances[0] ?? null;
  if (instance == null) {
    return null;
  }
  if (typeof webflow.setSelectedElement === "function") {
    try {
      await webflow.setSelectedElement(instance);
    } catch {
      /* selection is optional */
    }
  }
  return instance;
}
