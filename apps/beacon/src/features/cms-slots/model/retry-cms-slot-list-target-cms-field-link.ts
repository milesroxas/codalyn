import {
  bindCmsSlotListTargetInstancesToListCmsText,
  ensureCmsSlotListCmsTextFieldOnList,
} from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import { listCmsSlotListTargetInstancesOnPage } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import { getCmsSlotListTargetComponentOrNull } from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import { formatWebflowDesignerError } from "@/shared/lib/webflow-designer-error";

export type RetryCmsSlotListTargetCmsFieldLinkResult = { ok: true } | { ok: false; message: string };

/**
 * Re-attempts CMS `Text` prop binding after the user refreshes Designer (CMS ↔ Designer). Selects the first
 * list-target instance on canvas before binding — matching manual “focus on canvas” behavior.
 */
export async function retryCmsSlotListTargetCmsFieldLink(options: {
  dataList: string;
  listContainer: BlockElement;
  preferredDefinitionId?: string | null;
  collectionId: string;
  fieldId: string;
}): Promise<RetryCmsSlotListTargetCmsFieldLinkResult> {
  const cmsEnsure = await ensureCmsSlotListCmsTextFieldOnList(options.listContainer, options.dataList);
  const binding = cmsEnsure?.binding ?? {
    collectionId: options.collectionId,
    fieldId: options.fieldId,
  };
  if (binding.collectionId.trim() === "" || binding.fieldId.trim() === "") {
    return {
      ok: false,
      message:
        "Could not create or find the CMS Plain Text field for this beacon list. Check your Webflow connection in Tower and try again.",
    };
  }
  const def = await getCmsSlotListTargetComponentOrNull(
    options.dataList,
    options.listContainer,
    options.preferredDefinitionId
  );
  if (def == null) {
    return { ok: false, message: "No list target component found for this beacon list." };
  }

  const instances = await listCmsSlotListTargetInstancesOnPage(options.dataList, options.listContainer, {
    preferredDefinitionId: options.preferredDefinitionId,
  });
  if (instances.length === 0) {
    return { ok: false, message: "Place the list target on the canvas, then try linking again." };
  }

  const focus = instances[0];
  if (typeof webflow.setSelectedElement === "function") {
    try {
      await webflow.setSelectedElement(focus);
    } catch {
      /* selection helps binding but is optional */
    }
  }

  try {
    await bindCmsSlotListTargetInstancesToListCmsText({
      dataList: options.dataList,
      listContainer: options.listContainer,
      def,
      instances,
      priorityInstances: [focus],
      resolvedBinding: binding,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, message: formatWebflowDesignerError(err) };
  }
}
