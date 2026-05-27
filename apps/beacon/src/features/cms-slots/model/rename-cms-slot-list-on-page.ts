import { syncCmsSlotPageInlineScript } from "@/features/cms-slots/model/cms-slot-page-inline-script";
import {
  applyCmsSlotListTargetSync,
  getCmsSlotListTargetComponentOrNull,
} from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import { dataListValueForCmsSlotName } from "@/features/cms-slots/model/create-cms-slot-target";
import { runExclusiveDesignerStyleOp } from "@/features/cms-slots/model/exclusive-designer-style-op";
import { reconcileCmsSlotListTarget } from "@/features/cms-slots/model/reconcile-cms-slot-list-target";

export async function renameCmsSlotListOnPage(input: {
  container: BlockElement;
  fromDataList: string;
  nextDisplayName: string;
  otherDataListsOnPage: ReadonlySet<string>;
  preferredDefinitionId?: string | null;
}): Promise<{ ok: true; dataList: string } | { ok: false; reason: string }> {
  const { container, fromDataList, nextDisplayName, otherDataListsOnPage, preferredDefinitionId } = input;

  let toDataList: string;
  try {
    toDataList = dataListValueForCmsSlotName(nextDisplayName);
  } catch {
    return { ok: false, reason: "Use a name with at least one letter or number." };
  }

  if (toDataList === fromDataList) {
    return { ok: true, dataList: toDataList };
  }

  if (otherDataListsOnPage.has(toDataList)) {
    return { ok: false, reason: "Another slot on this page already uses that name." };
  }

  const listTarget = await getCmsSlotListTargetComponentOrNull(fromDataList, container, preferredDefinitionId);

  await container.setCustomAttribute("data-list", toDataList);

  if (listTarget != null) {
    await runExclusiveDesignerStyleOp(async () => {
      await applyCmsSlotListTargetSync(listTarget, toDataList, container);
    });
    const reconciled = await reconcileCmsSlotListTarget(toDataList, container);
    if (reconciled.type === "update_apply_failed") {
      return { ok: false, reason: reconciled.errorMessage };
    }
  }

  await syncCmsSlotPageInlineScript();
  return { ok: true, dataList: toDataList };
}
