import {
  ensureCmsSlotListTargetLayoutStyle,
  ensureCmsSlotListTargetSlotStyle,
} from "@/features/cms-slots/model/cms-slot-list-target-slot-style";
import { tryAddCmsSlotListTargetTextPropDirectToDefinition } from "@/features/cms-slots/model/cms-slot-list-target-text-field";
import { runExclusiveDesignerStyleOp } from "@/features/cms-slots/model/exclusive-designer-style-op";
import { webflowDesignerErrorCauseTag } from "@/shared/lib/webflow-designer-error";

/** Components panel group for Beacon utility definitions. */
export const CMS_SLOT_UTILITIES_COMPONENT_GROUP = "Beacon Utilities";

/** Root tag for the list render target component (same data attributes as the hidden wrapper list block). */
export const CMS_SLOT_LIST_RENDER_TAG = "div";

/**
 * Legacy attribute on optional `<p>` nodes from older list-target components (mirroring still skips them).
 */
export const CMS_SLOT_LIST_TARGET_HINT_ATTR = "data-beacon-list-target-hint";

const LOG_PREFIX = "[Beacon list target]";

const ID_TAIL_LENGTH = 8;

function logListTargetDebug(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(LOG_PREFIX, message, detail);
  } else {
    console.log(LOG_PREFIX, message);
  }
}

export function uniqueCmsSlotListTargetComponentName(dataList: string, listContainer: BlockElement): string {
  const el = String(listContainer.id.element);
  const tail = el.length <= ID_TAIL_LENGTH ? el : el.slice(-ID_TAIL_LENGTH);
  return `${dataList} · ${tail}`;
}

/** True when this definition’s DOM root matches the given beacon list (placement hint after create). */
async function beaconListTargetDefinitionMatchesList(
  comp: Component,
  dataList: string,
  listContainer: BlockElement
): Promise<boolean> {
  const root = await comp.getRootElement();
  if (root == null || root.type !== "DOM") {
    return false;
  }
  const dom = root as DOMElement;
  if ((await dom.getTag()) !== CMS_SLOT_LIST_RENDER_TAG) {
    return false;
  }
  const desired = cmsSlotListTargetDataAttributes(dataList, listContainer);
  for (const [key, value] of Object.entries(desired)) {
    if ((await dom.getAttribute(key)) !== value) {
      return false;
    }
  }
  return true;
}

/**
 * When {@link preferredDefinitionId} resolves but the root’s `data-beacon-list-*` ids are stale (e.g. the hidden list
 * block was duplicated or the Designer reports a different `BlockElement` id on CMS template / collection pages),
 * we still need to treat that definition as *this* list: same `data-list` + `data-target` on the registered root.
 * Full list identity is then re-applied via {@link applyCmsSlotListTargetSync}.
 */
async function beaconListTargetRootMatchesDataList(comp: Component, dataList: string): Promise<boolean> {
  const root = await comp.getRootElement();
  if (root == null || root.type !== "DOM") {
    return false;
  }
  const dom = root as DOMElement;
  if ((await dom.getTag()) !== CMS_SLOT_LIST_RENDER_TAG) {
    return false;
  }
  if ((await dom.getAttribute("data-target")) !== "beacons") {
    return false;
  }
  return (await dom.getAttribute("data-list")) === dataList;
}

/**
 * Tries `webflow.getComponent(preferredDefinitionId)` and sync/validation; `null` = fall back to name search.
 * Uses {@link applyCmsSlotListTargetSync} (declared below; safe at call time).
 */
async function tryGetBeaconListTargetByPreferredDefinitionId(
  preferredDefinitionId: string,
  dataList: string,
  listContainer: BlockElement
): Promise<Component | null> {
  try {
    const byId = await webflow.getComponent(preferredDefinitionId);
    if (await beaconListTargetDefinitionMatchesList(byId, dataList, listContainer)) {
      return byId;
    }
    if (await beaconListTargetRootMatchesDataList(byId, dataList)) {
      try {
        await applyCmsSlotListTargetSync(byId, dataList, listContainer);
      } catch (e) {
        logListTargetDebug("applyCmsSlotListTargetSync (preferredDefinitionId) failed, falling back to name search", e);
      }
      if (await beaconListTargetDefinitionMatchesList(byId, dataList, listContainer)) {
        return byId;
      }
    }
  } catch (e) {
    if (webflowDesignerErrorCauseTag(e) !== "ResourceMissing") {
      throw e;
    }
  }
  return null;
}

/**
 * `getComponentByName`, then `searchComponents` (Components panel name lookup).
 */
async function getBeaconListTargetComponentByNameOrSearch(name: string): Promise<Component | null> {
  try {
    return await webflow.getComponentByName(CMS_SLOT_UTILITIES_COMPONENT_GROUP, name);
  } catch (e) {
    if (webflowDesignerErrorCauseTag(e) === "ResourceMissing") {
      return null;
    }
  }
  const results = await webflow.searchComponents({ q: name });
  const hit = results.find((c) => c.name === name && c.group === CMS_SLOT_UTILITIES_COMPONENT_GROUP);
  if (hit == null) {
    return null;
  }
  try {
    return await webflow.getComponent(hit.id);
  } catch (e) {
    if (webflowDesignerErrorCauseTag(e) === "ResourceMissing") {
      return null;
    }
    throw e;
  }
}

/**
 * Resolves the list-target **component definition** by its deterministic name under
 * {@link CMS_SLOT_UTILITIES_COMPONENT_GROUP} (encodes `data-list` + list container). No separate storage: look up
 * the project’s registered components the same way the Components panel does.
 *
 * @param preferredDefinitionId When set (e.g. immediately after {@link createCmsSlotListTargetComponent}), prefer
 *   `webflow.getComponent(id)` first so placement is not blocked by a brief post-register index delay for
 *   `getComponentByName` / search.
 */
/**
 * Every registered list-target definition whose root `data-list` matches (Beacon Utilities group only).
 * Used when container-based name lookup misses after rename, stale ids, or uninstall cleanup.
 */
export async function listCmsSlotListTargetComponentsByDataList(dataList: string): Promise<Component[]> {
  const components = await webflow.getAllComponents();
  const out: Component[] = [];
  for (const comp of components) {
    const settings = await comp.getSettings();
    if (settings.group !== CMS_SLOT_UTILITIES_COMPONENT_GROUP) {
      continue;
    }
    if (await beaconListTargetRootMatchesDataList(comp, dataList)) {
      out.push(comp);
    }
  }
  return out;
}

export async function getCmsSlotListTargetComponentOrNull(
  dataList: string,
  listContainer: BlockElement,
  preferredDefinitionId?: string | null
): Promise<Component | null> {
  const name = uniqueCmsSlotListTargetComponentName(dataList, listContainer);
  const hint = preferredDefinitionId?.trim();
  if (hint) {
    const fromHint = await tryGetBeaconListTargetByPreferredDefinitionId(hint, dataList, listContainer);
    if (fromHint != null) {
      return fromHint;
    }
  }
  return getBeaconListTargetComponentByNameOrSearch(name);
}

/** Data attributes the list-target component root should carry (and match for “in sync” checks). */
export function cmsSlotListTargetDataAttributes(dataList: string, listContainer: BlockElement): Record<string, string> {
  return {
    "data-target": "beacons",
    "data-list": dataList,
    "data-beacon-list-element-id": listContainer.id.element,
    "data-beacon-list-component-id": listContainer.id.component,
    "data-beacon-target": "list",
  };
}

/**
 * @returns `true` when the registered component’s name and DOM root (tag + attributes) do not match the
 * current beacon list on the canvas (the list “instance” changed).
 */
export async function cmsSlotListTargetNeedsSync(
  component: Component,
  dataList: string,
  listContainer: BlockElement
): Promise<boolean> {
  const desiredName = uniqueCmsSlotListTargetComponentName(dataList, listContainer);
  if ((await component.getName()) !== desiredName) {
    return true;
  }
  const root = await component.getRootElement();
  if (root == null || root.type !== "DOM") {
    return true;
  }
  const dom = root as DOMElement;
  if ((await dom.getTag()) !== CMS_SLOT_LIST_RENDER_TAG) {
    return true;
  }
  const desired = cmsSlotListTargetDataAttributes(dataList, listContainer);
  for (const [key, value] of Object.entries(desired)) {
    if ((await dom.getAttribute(key)) !== value) {
      return true;
    }
  }
  return false;
}

/** Aligns the site component with the current list: display name, root tag, and data attributes. */
export async function applyCmsSlotListTargetSync(
  component: Component,
  dataList: string,
  listContainer: BlockElement
): Promise<void> {
  await runExclusiveDesignerStyleOp(async () => {
    const desiredName = uniqueCmsSlotListTargetComponentName(dataList, listContainer);
    if ((await component.getName()) !== desiredName) {
      await component.setName(desiredName);
    }
    const root = await component.getRootElement();
    if (root == null || root.type !== "DOM") {
      throw new Error("List target is missing a DOM root. Remove it and create a new list target.");
    }
    const dom = root as DOMElement;
    if ((await dom.getTag()) !== CMS_SLOT_LIST_RENDER_TAG) {
      await dom.setTag(CMS_SLOT_LIST_RENDER_TAG);
    }
    const desired = cmsSlotListTargetDataAttributes(dataList, listContainer);
    for (const [key, value] of Object.entries(desired)) {
      if ((await dom.getAttribute(key)) !== value) {
        await dom.setAttribute(key, value);
      }
    }
    const [slotStyle, layoutStyle] = await Promise.all([
      ensureCmsSlotListTargetSlotStyle(),
      ensureCmsSlotListTargetLayoutStyle(),
    ]);
    await dom.setStyles([slotStyle, layoutStyle]);
  });
}

/**
 * Registers a site component under {@link CMS_SLOT_UTILITIES_COMPONENT_GROUP} whose root is a single DOM node that
 * identifies **this beacon list** (the `data-list` target), not the component instances inside the list.
 *
 * On a CMS collection template, call {@link ensureCmsSlotListCmsTextFieldOnList} **before** this so the Plain Text
 * field exists and the Designer bind catalog is refreshed prior to registration and placement.
 *
 * Also adds a **`textContent`** “Text” prop (`tryAddCmsSlotListTargetTextPropDirectToDefinition`), sets empty root
 * text in the builder, and binds that prop to the root DOM. `ensureCmsSlotListTargetTextProp` runs on place/reconcile
 * when direct creation is not available.
 *
 * @returns `definitionId` from {@link webflow.registerComponent} — use for placement / `getComponent`; prefer over
 *   `component.id` so resolution matches the definition Webflow just registered.
 */
export async function createCmsSlotListTargetComponent(input: {
  dataList: string;
  listContainer: BlockElement;
}): Promise<{ component: Component; definitionId: string }> {
  const { dataList, listContainer } = input;
  const existing = await getCmsSlotListTargetComponentOrNull(dataList, listContainer);
  if (existing != null) {
    await applyCmsSlotListTargetSync(existing, dataList, listContainer);
    await tryAddCmsSlotListTargetTextPropDirectToDefinition(existing);
    return { component: existing, definitionId: existing.id };
  }

  const name = uniqueCmsSlotListTargetComponentName(dataList, listContainer);
  const attrs = cmsSlotListTargetDataAttributes(dataList, listContainer);

  const { component: comp, definitionId } = await runExclusiveDesignerStyleOp(async () => {
    const root = webflow.elementBuilder(webflow.elementPresets.DOM);
    root.setTag(CMS_SLOT_LIST_RENDER_TAG);
    for (const [k, v] of Object.entries(attrs)) {
      root.setAttribute(k, v);
    }

    const [slotStyle, layoutStyle] = await Promise.all([
      ensureCmsSlotListTargetSlotStyle(),
      ensureCmsSlotListTargetLayoutStyle(),
    ]);
    root.setStyles([slotStyle, layoutStyle]);
    root.setTextContent("");

    const registered = await webflow.registerComponent(
      {
        name,
        group: CMS_SLOT_UTILITIES_COMPONENT_GROUP,
        description: "Beacon list render target (Codalyn Beacon)",
      },
      root
    );

    const definitionId = registered.id;
    const component = await webflow.getComponent(definitionId);
    await tryAddCmsSlotListTargetTextPropDirectToDefinition(component);
    return { component, definitionId };
  });

  logListTargetDebug("registerComponent: done", {
    definitionId,
    componentId: comp.id,
    name: await comp.getName(),
    group: (await comp.getSettings()).group,
    dataList,
  });

  return { component: comp, definitionId };
}
