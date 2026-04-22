import { ensureBeaconListTargetSlotStyle } from "@/features/beacons/model/beacon-list-target-slot-style";
import { runExclusiveDesignerStyleOp } from "@/features/beacons/model/exclusive-designer-style-op";

/** Components panel group for Beacon utility definitions. */
export const BEACON_UTILITIES_COMPONENT_GROUP = "Beacon Utilities";

/** Root tag for the list render target component (same data attributes as the hidden wrapper list block). */
export const BEACON_LIST_RENDER_TAG = "div";

const ID_TAIL_LENGTH = 8;

export function uniqueBeaconListTargetComponentName(dataList: string, listContainer: BlockElement): string {
  const el = String(listContainer.id.element);
  const tail = el.length <= ID_TAIL_LENGTH ? el : el.slice(-ID_TAIL_LENGTH);
  return `${dataList} · ${tail}`;
}

function designerErrorTag(err: unknown): string | undefined {
  const t = (err as { cause?: { tag?: string } } | null | undefined)?.cause?.tag;
  return typeof t === "string" ? t : undefined;
}

/**
 * Resolves the list-target **component definition** by its deterministic name under
 * {@link BEACON_UTILITIES_COMPONENT_GROUP} (encodes `data-list` + list container). No separate storage: look up
 * the project’s registered components the same way the Components panel does.
 */
export async function getBeaconListTargetComponentOrNull(
  dataList: string,
  listContainer: BlockElement
): Promise<Component | null> {
  const name = uniqueBeaconListTargetComponentName(dataList, listContainer);
  try {
    return await webflow.getComponentByName(BEACON_UTILITIES_COMPONENT_GROUP, name);
  } catch (e) {
    if (designerErrorTag(e) === "ResourceMissing") {
      return null;
    }
  }
  const results = await webflow.searchComponents({ q: name });
  const hit = results.find((c) => c.name === name && c.group === BEACON_UTILITIES_COMPONENT_GROUP);
  return hit != null ? webflow.getComponent(hit.id) : null;
}

/** Data attributes the list-target component root should carry (and match for “in sync” checks). */
export function beaconListTargetDataAttributes(dataList: string, listContainer: BlockElement): Record<string, string> {
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
export async function beaconListTargetNeedsSync(
  component: Component,
  dataList: string,
  listContainer: BlockElement
): Promise<boolean> {
  const desiredName = uniqueBeaconListTargetComponentName(dataList, listContainer);
  if ((await component.getName()) !== desiredName) {
    return true;
  }
  const root = await component.getRootElement();
  if (root == null || root.type !== "DOM") {
    return true;
  }
  const dom = root as DOMElement;
  if ((await dom.getTag()) !== BEACON_LIST_RENDER_TAG) {
    return true;
  }
  const desired = beaconListTargetDataAttributes(dataList, listContainer);
  for (const [key, value] of Object.entries(desired)) {
    if ((await dom.getAttribute(key)) !== value) {
      return true;
    }
  }
  return false;
}

/** Aligns the site component with the current list: display name, root tag, and data attributes. */
export async function applyBeaconListTargetSync(
  component: Component,
  dataList: string,
  listContainer: BlockElement
): Promise<void> {
  await runExclusiveDesignerStyleOp(async () => {
    const desiredName = uniqueBeaconListTargetComponentName(dataList, listContainer);
    if ((await component.getName()) !== desiredName) {
      await component.setName(desiredName);
    }
    const root = await component.getRootElement();
    if (root == null || root.type !== "DOM") {
      throw new Error("List target is missing a DOM root. Remove it and create a new list target.");
    }
    const dom = root as DOMElement;
    if ((await dom.getTag()) !== BEACON_LIST_RENDER_TAG) {
      await dom.setTag(BEACON_LIST_RENDER_TAG);
    }
    const desired = beaconListTargetDataAttributes(dataList, listContainer);
    for (const [key, value] of Object.entries(desired)) {
      if ((await dom.getAttribute(key)) !== value) {
        await dom.setAttribute(key, value);
      }
    }
    const slotStyle = await ensureBeaconListTargetSlotStyle();
    await dom.setStyles([slotStyle]);
  });
}

/**
 * Registers a site component under {@link BEACON_UTILITIES_COMPONENT_GROUP} whose root is a single DOM node that
 * identifies **this beacon list** (the `data-list` target), not the component instances inside the list.
 */
export async function createBeaconListTargetComponent(input: {
  dataList: string;
  listContainer: BlockElement;
}): Promise<Component> {
  const { dataList, listContainer } = input;
  const name = uniqueBeaconListTargetComponentName(dataList, listContainer);
  const attrs = beaconListTargetDataAttributes(dataList, listContainer);

  return runExclusiveDesignerStyleOp(async () => {
    const root = webflow.elementBuilder(webflow.elementPresets.DOM);
    root.setTag(BEACON_LIST_RENDER_TAG);
    for (const [k, v] of Object.entries(attrs)) {
      root.setAttribute(k, v);
    }

    const slotStyle = await ensureBeaconListTargetSlotStyle();
    root.setStyles([slotStyle]);

    return webflow.registerComponent(
      {
        name,
        group: BEACON_UTILITIES_COMPONENT_GROUP,
        description: "Beacon list render target (Codalyn Beacon)",
      },
      root
    );
  });
}
