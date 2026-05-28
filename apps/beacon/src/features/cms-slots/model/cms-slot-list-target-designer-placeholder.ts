import { verifyCmsSlotListTargetDomRoot } from "@/features/cms-slots/model/cms-slot-list-target-instance-surface";
import { listCmsSlotListTargetInstancesOnPage } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import { CMS_SLOTS_LIST_TARGET_DESIGNER_LABEL } from "@/shared/lib/cms-slots-feature-copy";

/** Visible in the Designer only; stripped on the published page by the beacon runtime. */
export const CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_LABEL = CMS_SLOTS_LIST_TARGET_DESIGNER_LABEL;

/**
 * Inline style keys applied to list-target roots in the Designer. The footer runtime removes each property in
 * {@link cmsSlotListTargetDesignerPlaceholderRuntimeRemovalSource}.
 */
export const CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_INLINE_KEYS = [
  "box-sizing",
  "display",
  "min-height",
  "padding",
  "border",
  "background-color",
  "color",
  "font-size",
  "line-height",
  "overflow",
  "position",
] as const;

const CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_INLINE_MAP: Record<
  (typeof CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_INLINE_KEYS)[number],
  string
> = {
  "box-sizing": "border-box",
  display: "block",
  "min-height": "3rem",
  padding: "0.75rem 1rem",
  border: "1px dashed rgba(0, 0, 0, 0.25)",
  "background-color": "rgba(0, 0, 0, 0.04)",
  color: "transparent",
  "font-size": "0",
  "line-height": "0",
  overflow: "hidden",
  position: "relative",
};

/** Serialized `style` attribute for list-target roots (Designer canvas). */
export function cmsSlotListTargetDesignerPlaceholderInlineStyle(): string {
  return CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_INLINE_KEYS.map(
    (key) => `${key}:${CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_INLINE_MAP[key]}`
  ).join(";");
}

/** Minified snippet embedded in {@link getCmsSlotPageInlineScriptSource}. */
export function cmsSlotListTargetDesignerPlaceholderRuntimeRemovalSource(): string {
  const keys = CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_INLINE_KEYS.map((k) => JSON.stringify(k)).join(",");
  return `var phKeys=[${keys}];for(var pi=0;pi<phKeys.length;pi++)target.style.removeProperty(phKeys[pi]);`;
}

export async function applyCmsSlotListTargetDesignerPlaceholderToDom(dom: DOMElement): Promise<void> {
  await dom.setAttribute("style", cmsSlotListTargetDesignerPlaceholderInlineStyle());
  await dom.setAttribute("aria-label", CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_LABEL);
}

export async function clearCmsSlotListTargetDesignerPlaceholderFromDom(dom: DOMElement): Promise<void> {
  await dom.setAttribute("style", "");
  await dom.removeAttribute("aria-label");
}

async function applyDesignerPlaceholderToListTargetInstance(
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
    if (root != null && root.type === "DOM" && (await verifyCmsSlotListTargetDomRoot(root, dataList, listContainer))) {
      await applyCmsSlotListTargetDesignerPlaceholderToDom(root as DOMElement);
    }
  } finally {
    await webflow.exitComponent();
  }
}

/** Applies designer placeholder inline styles to every list-target instance for this CMS slot. */
export async function applyCmsSlotListTargetDesignerPlaceholderForList(
  dataList: string,
  listContainer: BlockElement,
  preferredDefinitionId?: string | null
): Promise<void> {
  const instances = await listCmsSlotListTargetInstancesOnPage(dataList, listContainer, { preferredDefinitionId });
  for (const instance of instances) {
    await applyDesignerPlaceholderToListTargetInstance(instance, dataList, listContainer);
  }
}
