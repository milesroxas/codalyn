import {
  readCmsSlotListRuntimePayloadText,
  saveCmsSlotListRuntimePayloadToCmsItem,
  setCmsSlotListTargetInstancesStaticRuntimeText,
} from "@/features/cms-slots/model/cms-slot-list-cms-composition-save";
import {
  parseCmsSlotListRuntimePayload,
  resolveCmsSlotPublishedDisplayName,
  sanitizeSlotLabelForPayload,
  serializeCmsSlotListRuntimePayload,
} from "@/features/cms-slots/model/cms-slot-list-runtime-payload";
import {
  bindCmsSlotListTargetInstancesToListCmsText,
  ensureCmsSlotListCmsTextFieldOnList,
  getCmsTemplateCollectionIdFromCurrentPage,
} from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import { listCmsSlotListTargetInstancesOnPage } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import { syncCmsSlotPageInlineScript } from "@/features/cms-slots/model/cms-slot-page-inline-script";
import type { HydratedCmsSlotRow } from "@/features/cms-slots/model/cms-slot-page-targets";
import {
  designerRowForRuntimeCloneIndex,
  maxHiddenListDomChildIndex,
  runtimeCloneIndexForDesignerPoolIndex,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import { getCmsSlotListTargetComponentOrNull } from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import { getTowerOrigin } from "@/shared/lib/tower-client";

function nextSlotLabelsAfterPoolRename(
  payload: NonNullable<ReturnType<typeof parseCmsSlotListRuntimePayload>>,
  designerScopedRows: ReadonlyArray<HydratedCmsSlotRow>,
  poolIndex: number,
  rawNextName: string
): string[] {
  const row = designerScopedRows[poolIndex];
  const fallback = row?.name.trim() || "Untitled";
  const sanitizedInput = sanitizeSlotLabelForPayload(rawNextName);
  const labelForRenamedPool = sanitizedInput !== "" ? sanitizedInput : fallback;

  return payload.i.map((runtimeIdx, u) => {
    const renamedRuntimeIdx = runtimeCloneIndexForDesignerPoolIndex(designerScopedRows, poolIndex);
    if (runtimeIdx === renamedRuntimeIdx) {
      return labelForRenamedPool;
    }
    const defRow = designerRowForRuntimeCloneIndex(designerScopedRows, runtimeIdx);
    const defName = defRow?.name ?? "";
    return resolveCmsSlotPublishedDisplayName(defName, payload.n?.[u]);
  });
}

/**
 * Updates only `n[]` for every composed row that uses `poolIndex`, re-serializing with the same `i` and `p` so
 * labels stay aligned with Composer (single runtime JSON blob).
 */
export async function renamePublishedSlotDisplayNameAtPoolIndex(input: {
  listContainer: BlockElement;
  dataList: string;
  preferredDefinitionId: string | null;
  currentCmsItemId: string | null;
  designerScopedRows: ReadonlyArray<HydratedCmsSlotRow>;
  poolIndex: number;
  nextName: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { listContainer, dataList, preferredDefinitionId, currentCmsItemId, designerScopedRows, poolIndex, nextName } =
    input;
  if (poolIndex < 0 || poolIndex >= designerScopedRows.length) {
    return { ok: false, reason: "Slot index is out of range." };
  }

  const text = await readCmsSlotListRuntimePayloadText({
    listContainer,
    dataList,
    preferredDefinitionId,
    currentCmsItemId,
  });
  if (text == null || text.trim() === "") {
    return {
      ok: false,
      reason:
        "No saved layout JSON yet. Save a composition from Composer (or ensure the list target text field is set), then try again.",
    };
  }

  const parsed = parseCmsSlotListRuntimePayload(text, maxHiddenListDomChildIndex(designerScopedRows) + 1);
  if (parsed == null || parsed.i.length === 0) {
    return {
      ok: false,
      reason: "Could not read the beacon layout JSON. Fix or re-save the composition from Composer.",
    };
  }

  const slotLabels = nextSlotLabelsAfterPoolRename(parsed, designerScopedRows, poolIndex, nextName);

  const onCmsTemplate = (await getCmsTemplateCollectionIdFromCurrentPage()) != null;
  if (onCmsTemplate) {
    if (!getTowerOrigin().trim() || currentCmsItemId == null) {
      return {
        ok: false,
        reason:
          "On a collection template, select a collection item and connect Codalyn to Tower to edit published slot names.",
      };
    }
    const cmsEnsure = await ensureCmsSlotListCmsTextFieldOnList(listContainer, dataList);
    if (cmsEnsure == null) {
      return {
        ok: false,
        reason: "Could not use the list CMS text field. Create and sync a list target for this list, then try again.",
      };
    }
    const binding = cmsEnsure.binding;
    const listTargetDef = await getCmsSlotListTargetComponentOrNull(dataList, listContainer, preferredDefinitionId);
    if (listTargetDef != null) {
      const listTargetOnPage = await listCmsSlotListTargetInstancesOnPage(dataList, listContainer, {
        preferredDefinitionId,
      });
      await bindCmsSlotListTargetInstancesToListCmsText({
        dataList,
        listContainer,
        def: listTargetDef,
        instances: listTargetOnPage,
        resolvedBinding: binding,
      });
    }
    await saveCmsSlotListRuntimePayloadToCmsItem({
      collectionId: binding.collectionId,
      fieldId: binding.fieldId,
      cmsItemId: currentCmsItemId,
      hiddenListIndices: parsed.i,
      propValueRows: parsed.p,
      slotLabels,
    });
  } else {
    await setCmsSlotListTargetInstancesStaticRuntimeText({
      dataList,
      listContainer,
      preferredDefinitionId,
      text: serializeCmsSlotListRuntimePayload(parsed.i, parsed.p, slotLabels),
    });
  }

  await syncCmsSlotPageInlineScript();
  return { ok: true };
}
