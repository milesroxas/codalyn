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

/** True when this DOM node is the registered list-target root for this CMS slot (not Body / page chrome). */
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
 * Mirror only ever inserts `ComponentInstance` nodes (plus an optional Codalyn hint `<p>`). If we see
 * other node types, this is not the real list-target inner surface — do not bulk-remove children.
 */
async function mirrorChildrenAreOnlyComponentInstances(contentRoot: ListTargetMirrorParent): Promise<boolean> {
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

/** True when this instance’s inner surface matches this CMS slot (for filtering name collisions). */
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
