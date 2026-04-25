import { ensureBeaconListTargetCmsTextBindingForPageInstances } from "@/features/beacons/model/beacon-list-target-cms-text-binding";
import { listBeaconListTargetInstancesOnPage } from "@/features/beacons/model/beacon-list-target-instances-on-page";
import { ensureBeaconListTargetTextProp } from "@/features/beacons/model/beacon-list-target-text-field";
import {
  applyBeaconListTargetSync,
  beaconListTargetNeedsSync,
  getBeaconListTargetComponentOrNull,
} from "@/features/beacons/model/create-beacon-list-target-component";
import { runExclusiveDesignerStyleOp } from "@/features/beacons/model/exclusive-designer-style-op";

function formatReconcileError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Check that you can edit the current project.";
}

export type ReconcileBeaconListTargetResult =
  | { type: "absent" }
  | { type: "ready"; name: string; listWasUpdated: boolean }
  | { type: "update_apply_failed"; name: string | null; errorMessage: string };

/**
 * Resolves the list-target component by name (see {@link getBeaconListTargetComponentOrNull}), applies updates
 * when the canvas list no longer matches, or reports absent.
 */
export async function reconcileBeaconListTarget(
  dataList: string,
  listContainer: BlockElement
): Promise<ReconcileBeaconListTargetResult> {
  const opResult = await runExclusiveDesignerStyleOp(async (): Promise<ReconcileBeaconListTargetResult> => {
    const comp = await getBeaconListTargetComponentOrNull(dataList, listContainer);
    if (comp == null) {
      return { type: "absent" };
    }

    const needs = await beaconListTargetNeedsSync(comp, dataList, listContainer);
    if (needs) {
      try {
        await applyBeaconListTargetSync(comp, dataList, listContainer);
      } catch (e) {
        const name = await comp.getName().catch(() => null);
        return { type: "update_apply_failed", name, errorMessage: formatReconcileError(e) };
      }
    }

    try {
      await ensureBeaconListTargetTextProp(comp, { dataList, listContainer });
    } catch {
      /* List target is still usable; Text field is added on create/place in normal cases. */
    }

    const name = await comp.getName();
    return { type: "ready", name, listWasUpdated: needs };
  });

  if (opResult.type === "ready") {
    try {
      const comp = await getBeaconListTargetComponentOrNull(dataList, listContainer);
      if (comp != null) {
        const instances = await listBeaconListTargetInstancesOnPage(dataList, listContainer);
        await ensureBeaconListTargetCmsTextBindingForPageInstances({
          dataList,
          listContainer,
          def: comp,
          instances,
        });
      }
    } catch (e) {
      console.warn("[beacon] CMS text bind (reconcile):", e);
    }
  }

  return opResult;
}

export type BeaconListTargetOpenReconcile = {
  phase: "absent" | "synced";
  displayName: string | null;
  toasts: Array<{ type: "Success" | "Error" | "Info" | "Warning"; message: string }>;
};

/** Single call site for the “open a beacon / composition” flow: map reconcile result to UI + optional toasts. */
export async function reconcileBeaconListTargetForOpen(
  dataList: string,
  listContainer: BlockElement
): Promise<BeaconListTargetOpenReconcile> {
  const r = await reconcileBeaconListTarget(dataList, listContainer);
  if (r.type === "absent") {
    return { phase: "absent", displayName: null, toasts: [] };
  }
  if (r.type === "update_apply_failed") {
    return { phase: "synced", displayName: r.name, toasts: [{ type: "Error", message: r.errorMessage }] };
  }
  const toasts: BeaconListTargetOpenReconcile["toasts"] = [];
  if (r.listWasUpdated) {
    toasts.push({ type: "Success", message: "List target updated to match this beacon list." });
  }
  return { phase: "synced", displayName: r.name, toasts };
}
