import {
  type CmsSlotListCmsBinding,
  isListTargetTextPropValueLinkedToCms,
  readCmsSlotListTargetCmsBindingFromListContainer,
} from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import { listCmsSlotListTargetInstancesOnPageByName } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import { getCmsSlotListTargetTextProp } from "@/features/cms-slots/model/cms-slot-list-target-text-field";
import { getCmsSlotListTargetComponentOrNull } from "@/features/cms-slots/model/create-cms-slot-list-target-component";

export type DetectCmsSlotListTargetCmsFieldLinkResult =
  | { status: "linked" }
  | { status: "unlinked"; binding: CmsSlotListCmsBinding }
  | { status: "skipped" };

/**
 * Checks whether list-target instance Text props on the current page are bound to the slot’s CMS Plain Text field.
 * Used when opening Designer for a slot so stale Designer CMS caches surface an inline “Link CMS field” action.
 */
export async function detectCmsSlotListTargetCmsFieldLink(options: {
  dataList: string;
  listContainer: BlockElement;
  preferredDefinitionId?: string | null;
}): Promise<DetectCmsSlotListTargetCmsFieldLinkResult> {
  const binding = await readCmsSlotListTargetCmsBindingFromListContainer(options.listContainer);
  if (binding == null) {
    return { status: "skipped" };
  }

  // Identity-only list: detection reads each instance's props via `searchProps` (page-level, no `enterComponent`).
  // The surface-check variant would enter/exit each instance, flickering the canvas and selecting an instance right
  // as the create-flow CMS field link dialog opens.
  const instances = await listCmsSlotListTargetInstancesOnPageByName(options.dataList, options.listContainer, {
    preferredDefinitionId: options.preferredDefinitionId,
  });
  if (instances.length === 0) {
    return { status: "skipped" };
  }

  const def = await getCmsSlotListTargetComponentOrNull(
    options.dataList,
    options.listContainer,
    options.preferredDefinitionId
  );
  if (def == null) {
    return { status: "skipped" };
  }

  const textProp = await getCmsSlotListTargetTextProp(def);
  if (textProp == null) {
    return { status: "unlinked", binding };
  }

  for (const instance of instances) {
    const rows = await instance.searchProps();
    const bound = rows.find((row) => row.propId === textProp.id);
    const value = bound?.value ?? null;
    if (!isListTargetTextPropValueLinkedToCms(value, binding)) {
      return { status: "unlinked", binding };
    }
  }

  return { status: "linked" };
}
