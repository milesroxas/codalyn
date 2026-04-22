import {
  BEACON_LIST_RENDER_TAG,
  beaconListTargetDataAttributes,
} from "@/features/beacons/model/create-beacon-list-target-component";

const FORBIDDEN_MIRROR_CONTEXT_TYPES = new Set<string>(["Body", "Html", "Document", "Head"]);

/** Slot or DOM root: append/list children for list-target designer mirror. */
export type ListTargetMirrorParent = {
  getChildren: () => Promise<AnyElement[]>;
  append: (c: Component) => Promise<unknown>;
};

function isDomMirrorParent(el: AnyElement | null | undefined): el is AnyElement & ListTargetMirrorParent {
  if (el == null) return false;
  if ((el as { children?: boolean }).children !== true) return false;
  if (typeof (el as { getChildren?: unknown }).getChildren !== "function") return false;
  if (typeof (el as { append?: unknown }).append !== "function") return false;
  return true;
}

function asSlotMirrorParent(slot: SlotInstanceElement): ListTargetMirrorParent {
  return {
    getChildren: () => slot.getChildren(),
    append: (c) => slot.append(c),
  };
}

/** True when this DOM node is the registered list-target root for this beacon list (not Body / page chrome). */
export async function verifyBeaconListTargetDomRoot(
  el: AnyElement,
  dataList: string,
  listContainer: BlockElement
): Promise<boolean> {
  if (FORBIDDEN_MIRROR_CONTEXT_TYPES.has(el.type)) {
    return false;
  }
  if (el.type !== "DOM") {
    return false;
  }
  const dom = el as DOMElement;
  if ((await dom.getTag()) !== BEACON_LIST_RENDER_TAG) {
    return false;
  }
  const desired = beaconListTargetDataAttributes(dataList, listContainer);
  for (const [k, v] of Object.entries(desired)) {
    if ((await dom.getAttribute(k)) !== v) {
      return false;
    }
  }
  return true;
}

/**
 * Mirror only ever inserts `ComponentInstance` nodes. If we see Blocks/Sections/etc., this is not the real
 * list-target inner surface (or Designer returned an unexpected context) — do not bulk-remove children.
 */
export async function mirrorChildrenAreOnlyComponentInstances(contentRoot: ListTargetMirrorParent): Promise<boolean> {
  const ch = await contentRoot.getChildren();
  for (const c of ch) {
    if (FORBIDDEN_MIRROR_CONTEXT_TYPES.has(c.type)) {
      return false;
    }
    if (c.type !== "ComponentInstance") {
      return false;
    }
  }
  return true;
}

async function mirrorParentForEnteredListTarget(
  instance: ComponentElement,
  root: AnyElement,
  dataList: string,
  listContainer: BlockElement
): Promise<ListTargetMirrorParent | null> {
  if (!(await verifyBeaconListTargetDomRoot(root, dataList, listContainer))) {
    return null;
  }
  const slots = await instance.getSlots();
  if (slots.length > 0) {
    return asSlotMirrorParent(slots[0]);
  }
  if (!isDomMirrorParent(root)) {
    return null;
  }
  return root as AnyElement & ListTargetMirrorParent;
}

/**
 * Runs `fn` on the list-target mirror surface only after verifying the component root and child shapes.
 * Avoids treating Body/page nodes as the mirror (which would delete the whole page).
 * @returns whether `fn` ran (surface was valid and child shapes were safe).
 */
export async function withListTargetMirrorSurface(
  instance: ComponentElement,
  dataList: string,
  listContainer: BlockElement,
  fn: (contentRoot: ListTargetMirrorParent) => Promise<void>
): Promise<boolean> {
  if (webflow.getCurrentComponent && (await webflow.getCurrentComponent()) != null) {
    await webflow.exitComponent();
  }
  await webflow.enterComponent(instance);
  try {
    const root = await webflow.getRootElement();
    if (root == null) {
      return false;
    }
    const contentRoot = await mirrorParentForEnteredListTarget(instance, root, dataList, listContainer);
    if (contentRoot == null) {
      return false;
    }
    if (!(await mirrorChildrenAreOnlyComponentInstances(contentRoot))) {
      return false;
    }
    await fn(contentRoot);
    return true;
  } finally {
    await webflow.exitComponent();
  }
}

/**
 * Removes only component instances from the mirror surface after verifying the list-target DOM root.
 * Does not require children to already be “mirror clean” (mixed nodes are left alone).
 */
export async function clearListTargetMirrorSurfaceComponentInstances(
  instance: ComponentElement,
  dataList: string,
  listContainer: BlockElement
): Promise<void> {
  if (webflow.getCurrentComponent && (await webflow.getCurrentComponent()) != null) {
    await webflow.exitComponent();
  }
  await webflow.enterComponent(instance);
  try {
    const root = await webflow.getRootElement();
    if (root == null) {
      return;
    }
    const contentRoot = await mirrorParentForEnteredListTarget(instance, root, dataList, listContainer);
    if (contentRoot == null) {
      return;
    }
    for (const c of await contentRoot.getChildren()) {
      if (c.type === "ComponentInstance") {
        await c.remove();
      }
    }
  } finally {
    await webflow.exitComponent();
  }
}

/** True when this instance’s inner surface matches this beacon list (for filtering name collisions). */
export async function instanceMatchesBeaconListTargetSurface(
  instance: ComponentElement,
  dataList: string,
  listContainer: BlockElement
): Promise<boolean> {
  if (webflow.getCurrentComponent && (await webflow.getCurrentComponent()) != null) {
    await webflow.exitComponent();
  }
  await webflow.enterComponent(instance);
  try {
    const root = await webflow.getRootElement();
    if (root == null) {
      return false;
    }
    const contentRoot = await mirrorParentForEnteredListTarget(instance, root, dataList, listContainer);
    if (contentRoot == null) {
      return false;
    }
    return mirrorChildrenAreOnlyComponentInstances(contentRoot);
  } finally {
    await webflow.exitComponent();
  }
}
