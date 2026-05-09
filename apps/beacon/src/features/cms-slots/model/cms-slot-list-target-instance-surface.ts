import {
  CMS_SLOT_LIST_RENDER_TAG,
  CMS_SLOT_LIST_TARGET_HINT_ATTR,
  cmsSlotListTargetDataAttributes,
} from "@/features/cms-slots/model/create-cms-slot-list-target-component";

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

async function isBeaconListTargetHintNode(el: AnyElement): Promise<boolean> {
  if (el.type === "Paragraph") {
    const mark = await (el as ParagraphElement).getCustomAttribute(CMS_SLOT_LIST_TARGET_HINT_ATTR);
    return mark != null && mark !== "";
  }
  if (el.type === "DOM") {
    const dom = el as DOMElement;
    if ((await dom.getTag()) !== "p") {
      return false;
    }
    const mark = await dom.getAttribute(CMS_SLOT_LIST_TARGET_HINT_ATTR);
    return mark != null && mark !== "";
  }
  return false;
}

/** True when this DOM node is the registered list-target root for this beacon list (not Body / page chrome). */
export async function verifyCmsSlotListTargetDomRoot(
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
  if ((await dom.getTag()) !== CMS_SLOT_LIST_RENDER_TAG) {
    return false;
  }
  const desired = cmsSlotListTargetDataAttributes(dataList, listContainer);
  for (const [k, v] of Object.entries(desired)) {
    if ((await dom.getAttribute(k)) !== v) {
      return false;
    }
  }
  return true;
}

/**
 * Clears the mirror surface so clones can be appended. Removes all children and clears root `textContent` when the
 * list-target root is a DOM node so bound CMS JSON is not left as visible text next to mirrored instances.
 */
async function clearListTargetMirrorContentForResync(
  contentRoot: ListTargetMirrorParent,
  listTargetRoot: AnyElement
): Promise<void> {
  for (const c of await contentRoot.getChildren()) {
    await c.remove();
  }
  if (listTargetRoot.type === "DOM" && typeof (listTargetRoot as DOMElement).setTextContent === "function") {
    await (listTargetRoot as DOMElement).setTextContent("");
  }
}

/**
 * Mirror only ever inserts `ComponentInstance` nodes (plus an optional Codalyn hint `<p>`). If we see
 * other node types, this is not the real list-target inner surface — do not bulk-remove children.
 */
export async function mirrorChildrenAreOnlyComponentInstances(contentRoot: ListTargetMirrorParent): Promise<boolean> {
  const ch = await contentRoot.getChildren();
  let hintNodes = 0;
  for (const c of ch) {
    if (FORBIDDEN_MIRROR_CONTEXT_TYPES.has(c.type)) {
      return false;
    }
    if (c.type === "ComponentInstance") {
      continue;
    }
    if (await isBeaconListTargetHintNode(c)) {
      hintNodes += 1;
      if (hintNodes > 1) {
        return false;
      }
      continue;
    }
    return false;
  }
  return true;
}

async function mirrorParentForEnteredListTarget(
  instance: ComponentElement,
  root: AnyElement,
  dataList: string,
  listContainer: BlockElement
): Promise<ListTargetMirrorParent | null> {
  if (!(await verifyCmsSlotListTargetDomRoot(root, dataList, listContainer))) {
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
      await clearListTargetMirrorContentForResync(contentRoot, root);
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
    if (root != null && root.type === "DOM" && typeof (root as DOMElement).setTextContent === "function") {
      await (root as DOMElement).setTextContent("");
    }
  } finally {
    await webflow.exitComponent();
  }
}

/** True when this instance’s inner surface matches this beacon list (for filtering name collisions). */
export async function instanceMatchesCmsSlotListTargetSurface(
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
