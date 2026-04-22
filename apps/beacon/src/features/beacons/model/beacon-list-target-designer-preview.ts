import {
  clearListTargetMirrorSurfaceComponentInstances,
  withListTargetMirrorSurface,
} from "@/features/beacons/model/beacon-list-target-instance-surface";
import { listBeaconListTargetInstancesOnPage } from "@/features/beacons/model/beacon-list-target-instances-on-page";
import { findBeaconTargetsOnPage, listInstancesInBeaconTarget } from "@/features/beacons/model/beacon-page-targets";
import { getBeaconListTargetComponentOrNull } from "@/features/beacons/model/create-beacon-list-target-component";
import { runExclusiveDesignerStyleOp } from "@/features/beacons/model/exclusive-designer-style-op";

/**
 * In **Preview** mode the site runs the beacon inline script; list targets are filled at runtime from the
 * hidden lists. In the Designer, that script does not run, so we mirror the same components into the list
 * target for a WYSIWYG **design** canvas. In Preview mode we clear the mirror so behavior matches published.
 */
export async function shouldMirrorBeaconListInDesignerTarget(): Promise<boolean> {
  if (typeof webflow.getCurrentMode !== "function") {
    return true;
  }
  return (await webflow.getCurrentMode()) !== "preview";
}

async function applyListTargetInstancePreview(
  instance: ComponentElement,
  sourceRows: Array<{ componentId: string }>,
  dataList: string,
  listContainer: BlockElement
): Promise<boolean> {
  return withListTargetMirrorSurface(instance, dataList, listContainer, async (contentRoot) => {
    for (const c of await contentRoot.getChildren()) {
      await c.remove();
    }
    for (const row of sourceRows) {
      const def = await webflow.getComponent(row.componentId);
      await contentRoot.append(def);
    }
  });
}

async function clearListTargetInstancePreview(
  instance: ComponentElement,
  dataList: string,
  listContainer: BlockElement
): Promise<void> {
  await clearListTargetMirrorSurfaceComponentInstances(instance, dataList, listContainer);
}

/**
 * Mirrors the hidden beacon list’s components into the list target while mirroring is enabled.
 * @returns true when instances were updated; false when mirroring was skipped (no-op).
 */
export async function syncBeaconListTargetDesignerPreview(
  dataList: string,
  listContainer: BlockElement
): Promise<boolean> {
  if (!(await shouldMirrorBeaconListInDesignerTarget())) {
    return false;
  }
  if ((await getBeaconListTargetComponentOrNull(dataList, listContainer)) == null) {
    return false;
  }
  const instances = await listBeaconListTargetInstancesOnPage(dataList, listContainer);
  if (instances.length === 0) {
    return false;
  }
  const sourceRows = await listInstancesInBeaconTarget(listContainer);
  let mirrored = false;
  await runExclusiveDesignerStyleOp(async () => {
    for (const inst of instances) {
      if (await applyListTargetInstancePreview(inst, sourceRows, dataList, listContainer)) {
        mirrored = true;
      }
    }
  });
  return mirrored;
}

/**
 * Restores the published-style **empty** list target (script fills at runtime) for every beacon on the current page.
 */
export async function clearAllBeaconListTargetDesignerPreviewsOnPage(): Promise<void> {
  return runExclusiveDesignerStyleOp(async () => {
    const beacons = await findBeaconTargetsOnPage();
    for (const b of beacons) {
      if ((await getBeaconListTargetComponentOrNull(b.dataList, b.container)) == null) {
        continue;
      }
      const instances = await listBeaconListTargetInstancesOnPage(b.dataList, b.container);
      for (const inst of instances) {
        await clearListTargetInstancePreview(inst, b.dataList, b.container);
      }
    }
  });
}

/**
 * Re-applies designer mirrors for all beacon list targets on the current page.
 */
export async function resyncAllBeaconListTargetDesignerPreviewsOnPage(): Promise<void> {
  if (!(await shouldMirrorBeaconListInDesignerTarget())) {
    return;
  }
  const beacons = await findBeaconTargetsOnPage();
  return runExclusiveDesignerStyleOp(async () => {
    for (const b of beacons) {
      if ((await getBeaconListTargetComponentOrNull(b.dataList, b.container)) == null) {
        continue;
      }
      const instances = await listBeaconListTargetInstancesOnPage(b.dataList, b.container);
      if (instances.length === 0) {
        continue;
      }
      const sourceRows = await listInstancesInBeaconTarget(b.container);
      for (const inst of instances) {
        await applyListTargetInstancePreview(inst, sourceRows, b.dataList, b.container);
      }
    }
  });
}
