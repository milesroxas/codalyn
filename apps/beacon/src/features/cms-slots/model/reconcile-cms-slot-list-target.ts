import { bindCmsSlotListTargetInstancesToListCmsText } from "@/features/cms-slots/model/cms-slot-list-target-cms-text-binding";
import { applyCmsSlotListTargetDesignerPlaceholderForList } from "@/features/cms-slots/model/cms-slot-list-target-designer-placeholder";
import { listCmsSlotListTargetInstancesOnPage } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import { ensureCmsSlotListTargetTextProp } from "@/features/cms-slots/model/cms-slot-list-target-text-field";
import {
  applyCmsSlotListTargetSync,
  cmsSlotListTargetNeedsSync,
  getCmsSlotListTargetComponentOrNull,
} from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import { runExclusiveDesignerStyleOp } from "@/features/cms-slots/model/exclusive-designer-style-op";

function formatReconcileError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Check that you can edit the current project.";
}

export type ReconcileCmsSlotListTargetResult =
  | { type: "absent" }
  | { type: "ready"; name: string; listWasUpdated: boolean }
  | { type: "update_apply_failed"; name: string | null; errorMessage: string };

/**
 * Resolves the list-target component by name (see {@link getCmsSlotListTargetComponentOrNull}), applies updates
 * when the canvas list no longer matches, or reports absent.
 */
export async function reconcileCmsSlotListTarget(
  dataList: string,
  listContainer: BlockElement
): Promise<ReconcileCmsSlotListTargetResult> {
  const opResult = await runExclusiveDesignerStyleOp(async (): Promise<ReconcileCmsSlotListTargetResult> => {
    const comp = await getCmsSlotListTargetComponentOrNull(dataList, listContainer);
    if (comp == null) {
      return { type: "absent" };
    }

    const needs = await cmsSlotListTargetNeedsSync(comp, dataList, listContainer);
    if (needs) {
      try {
        await applyCmsSlotListTargetSync(comp, dataList, listContainer);
      } catch (e) {
        const name = await comp.getName().catch(() => null);
        return { type: "update_apply_failed", name, errorMessage: formatReconcileError(e) };
      }
    }

    try {
      await ensureCmsSlotListTargetTextProp(comp);
    } catch {
      /* List target is still usable; Text field is added on create/place in normal cases. */
    }

    const name = await comp.getName();
    return { type: "ready", name, listWasUpdated: needs };
  });

  if (opResult.type === "ready") {
    try {
      const comp = await getCmsSlotListTargetComponentOrNull(dataList, listContainer);
      if (comp != null) {
        const instances = await listCmsSlotListTargetInstancesOnPage(dataList, listContainer);
        await bindCmsSlotListTargetInstancesToListCmsText({
          dataList,
          listContainer,
          def: comp,
          instances,
        });
      }
    } catch (e) {
      console.warn("[beacon] CMS text bind (reconcile):", e);
    }
    try {
      await applyCmsSlotListTargetDesignerPlaceholderForList(dataList, listContainer);
    } catch (e) {
      console.warn("[beacon] list target designer placeholder:", e);
    }
  }

  return opResult;
}

export type CmsSlotListTargetOpenReconcile = {
  phase: "absent" | "synced";
  displayName: string | null;
  toasts: Array<{ type: "Success" | "Error" | "Info" | "Warning"; message: string }>;
};

/** Single call site for the “open a beacon / composition” flow: map reconcile result to UI + optional toasts. */
export async function reconcileCmsSlotListTargetForOpen(
  dataList: string,
  listContainer: BlockElement
): Promise<CmsSlotListTargetOpenReconcile> {
  const r = await reconcileCmsSlotListTarget(dataList, listContainer);
  if (r.type === "absent") {
    return { phase: "absent", displayName: null, toasts: [] };
  }
  if (r.type === "update_apply_failed") {
    return { phase: "synced", displayName: r.name, toasts: [{ type: "Error", message: r.errorMessage }] };
  }
  const toasts: CmsSlotListTargetOpenReconcile["toasts"] = [];
  if (r.listWasUpdated) {
    toasts.push({ type: "Success", message: "List target updated to match this beacon list." });
  }
  return { phase: "synced", displayName: r.name, toasts };
}
