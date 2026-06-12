import { clearListTargetMirrorSurfaceComponentInstances } from "@/features/cms-slots/model/cms-slot-list-target-instance-surface";
import { listCmsSlotListTargetInstancesOnPage } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import { findCmsSlotListsOnPage } from "@/features/cms-slots/model/cms-slot-page-targets";
import { getCmsSlotListTargetComponentOrNull } from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import { runExclusiveDesignerOp } from "@/features/cms-slots/model/exclusive-designer-style-op";

async function clearListTargetInstancePreview(
  instance: ComponentElement,
  dataList: string,
  listContainer: BlockElement
): Promise<void> {
  await clearListTargetMirrorSurfaceComponentInstances(instance, dataList, listContainer);
}

/**
 * Restores the published-style **empty** list target (script fills at runtime) for every beacon on the current page.
 */
export async function clearAllCmsSlotListTargetDesignerPreviewsOnPage(): Promise<void> {
  return runExclusiveDesignerOp(async () => {
    const beacons = await findCmsSlotListsOnPage();
    for (const b of beacons) {
      if ((await getCmsSlotListTargetComponentOrNull(b.dataList, b.container)) == null) {
        continue;
      }
      const instances = await listCmsSlotListTargetInstancesOnPage(b.dataList, b.container);
      for (const inst of instances) {
        await clearListTargetInstancePreview(inst, b.dataList, b.container);
      }
    }
  });
}
