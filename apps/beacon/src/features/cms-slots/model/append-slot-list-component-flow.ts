import type { MutableRefObject } from "react";
import {
  type CmsSlotListCmsTextFieldEnsureResult,
  ensureCmsSlotListCmsTextFieldOnList,
} from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import { listCmsSlotListTargetInstancesOnPage } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import type { CmsSlotListTargetPhase } from "@/features/cms-slots/model/cms-slot-list-target-phase";
import {
  createCmsSlotListTargetComponent,
  getCmsSlotListTargetComponentOrNull,
} from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import { placeCmsSlotListTargetOnCanvas } from "@/features/cms-slots/model/place-cms-slot-list-target-on-canvas";
import {
  CMS_SLOTS_ROUTE_TASK_CHECKING_CMS_FIELD,
  CMS_SLOTS_ROUTE_TASK_CREATING_LIST_TARGET,
  CMS_SLOTS_ROUTE_TASK_FINISHING,
} from "@/shared/lib/cms-slots-feature-copy";

type ListTargetCache = {
  beaconKey: string;
  dataList: string;
  phase: "synced" | "absent";
  registeredName: string | null;
};

export async function ensureListTargetAfterAppendingSlotRow(options: {
  dataList: string;
  container: BlockElement;
  listTargetDefinitionIdRef: MutableRefObject<string | null>;
  activeBeaconKey: string | null;
  listTargetReconcileCacheRef: MutableRefObject<ListTargetCache | null>;
  setListTargetPhase: (p: CmsSlotListTargetPhase) => void;
  setListTargetRegisteredName: (n: string | null) => void;
  setListTargetOnCanvasCount: (n: number) => void;
  setListTargetOnCanvasCountResolved: (resolved: boolean) => void;
  onProgress?: (message: string) => void;
}): Promise<CmsSlotListCmsTextFieldEnsureResult | null> {
  const {
    dataList,
    container,
    listTargetDefinitionIdRef,
    activeBeaconKey,
    listTargetReconcileCacheRef,
    setListTargetPhase,
    setListTargetRegisteredName,
    setListTargetOnCanvasCount,
    setListTargetOnCanvasCountResolved,
    onProgress,
  } = options;
  try {
    onProgress?.(CMS_SLOTS_ROUTE_TASK_CHECKING_CMS_FIELD);
    const cmsEnsure = await ensureCmsSlotListCmsTextFieldOnList(container, dataList);
    const comp = await getCmsSlotListTargetComponentOrNull(dataList, container, listTargetDefinitionIdRef.current);
    if (comp == null) {
      onProgress?.(CMS_SLOTS_ROUTE_TASK_CREATING_LIST_TARGET);
      const { component: created, definitionId } = await createCmsSlotListTargetComponent({
        dataList,
        listContainer: container,
      });
      listTargetDefinitionIdRef.current = definitionId;
      const registeredName = await created.getName();
      setListTargetPhase("synced");
      setListTargetRegisteredName(registeredName);
      if (activeBeaconKey != null) {
        listTargetReconcileCacheRef.current = {
          beaconKey: activeBeaconKey,
          dataList,
          phase: "synced",
          registeredName,
        };
      }
    }
    await placeCmsSlotListTargetOnCanvas(dataList, container, listTargetDefinitionIdRef.current, {
      resolvedCmsEnsure: cmsEnsure,
      onProgress,
    });
    onProgress?.(CMS_SLOTS_ROUTE_TASK_FINISHING);
    try {
      const list = await listCmsSlotListTargetInstancesOnPage(dataList, container, {
        preferredDefinitionId: listTargetDefinitionIdRef.current,
      });
      setListTargetOnCanvasCount(list.length);
    } catch {
      setListTargetOnCanvasCount(0);
    } finally {
      setListTargetOnCanvasCountResolved(true);
    }
    return cmsEnsure;
  } catch (e) {
    console.warn("[cms-slots] list target after add component:", e);
    return null;
  }
}
