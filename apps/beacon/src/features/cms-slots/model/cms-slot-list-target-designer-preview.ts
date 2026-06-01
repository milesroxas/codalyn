import { applyCmsSlotListTargetDesignerPlaceholderForList } from "@/features/cms-slots/model/cms-slot-list-target-designer-placeholder";
import {
  clearListTargetMirrorSurfaceComponentInstances,
  withListTargetMirrorSurface,
} from "@/features/cms-slots/model/cms-slot-list-target-instance-surface";
import { listCmsSlotListTargetInstancesOnPage } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import {
  filterHydratedCmsSlotRowsByComponentIds,
  findCmsSlotListsOnPage,
  listInstancesInSlotListContainer,
  resolveCmsSlotEngineConfiguredComponentIds,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import { getCmsSlotListTargetComponentOrNull } from "@/features/cms-slots/model/create-cms-slot-list-target-component";
import { runExclusiveDesignerOp } from "@/features/cms-slots/model/exclusive-designer-style-op";

/**
 * In **Preview** mode the site runs the beacon inline script; list targets are filled at runtime from the
 * hidden lists. In the Designer, that script does not run, so we mirror the same components into the list
 * target for a WYSIWYG **design** canvas. In Preview mode we clear the mirror so behavior matches published.
 */
export async function shouldMirrorCmsSlotListInDesignerTarget(): Promise<boolean> {
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
  const expected = sourceRows.map((r) => r.componentId);
  let didChange = false;
  const ok = await withListTargetMirrorSurface(instance, dataList, listContainer, async (contentRoot) => {
    const children = await contentRoot.getChildren();
    const instanceChildren = children.filter((c): c is ComponentElement => c.type === "ComponentInstance");
    const actual: string[] = [];
    for (const c of instanceChildren) {
      actual.push((await c.getComponent()).id);
    }
    if (actual.length === expected.length && actual.every((id, i) => id === expected[i])) {
      return;
    }
    didChange = true;
    for (const c of instanceChildren) {
      await c.remove();
    }
    for (const row of sourceRows) {
      const def = await webflow.getComponent(row.componentId);
      await contentRoot.append(def);
    }
  });
  return ok && didChange;
}

async function clearListTargetInstancePreview(
  instance: ComponentElement,
  dataList: string,
  listContainer: BlockElement
): Promise<void> {
  await clearListTargetMirrorSurfaceComponentInstances(instance, dataList, listContainer);
}

/**
 * Mirrors the hidden CMS slot’s components into the list target while mirroring is enabled.
 * When the list target already shows the same component instances in order, skips DOM churn.
 * @returns true when instances were updated; false when mirroring was skipped (no-op).
 */
export async function syncCmsSlotListTargetDesignerPreview(
  dataList: string,
  listContainer: BlockElement
): Promise<boolean> {
  if (!(await shouldMirrorCmsSlotListInDesignerTarget())) {
    return false;
  }
  if ((await getCmsSlotListTargetComponentOrNull(dataList, listContainer)) == null) {
    return false;
  }
  const instances = await listCmsSlotListTargetInstancesOnPage(dataList, listContainer);
  if (instances.length === 0) {
    return false;
  }
  const allRows = await listInstancesInSlotListContainer(listContainer);
  const configuredComponentIds = await resolveCmsSlotEngineConfiguredComponentIds(listContainer, allRows);
  const sourceRows = filterHydratedCmsSlotRowsByComponentIds(allRows, configuredComponentIds);
  let mirrored = false;
  await runExclusiveDesignerOp(async () => {
    for (const inst of instances) {
      if (await applyListTargetInstancePreview(inst, sourceRows, dataList, listContainer)) {
        mirrored = true;
      }
    }
  });
  await applyCmsSlotListTargetDesignerPlaceholderForList(dataList, listContainer);
  return mirrored;
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

/**
 * Re-applies designer mirrors for all CMS slot list targets on the current page.
 */
export async function resyncAllCmsSlotListTargetDesignerPreviewsOnPage(): Promise<void> {
  if (!(await shouldMirrorCmsSlotListInDesignerTarget())) {
    return;
  }
  const beacons = await findCmsSlotListsOnPage();
  return runExclusiveDesignerOp(async () => {
    for (const b of beacons) {
      if ((await getCmsSlotListTargetComponentOrNull(b.dataList, b.container)) == null) {
        continue;
      }
      const instances = await listCmsSlotListTargetInstancesOnPage(b.dataList, b.container);
      if (instances.length === 0) {
        continue;
      }
      const allRows = await listInstancesInSlotListContainer(b.container);
      const configuredComponentIds = await resolveCmsSlotEngineConfiguredComponentIds(b.container, allRows);
      const sourceRows = filterHydratedCmsSlotRowsByComponentIds(allRows, configuredComponentIds);
      for (const inst of instances) {
        await applyListTargetInstancePreview(inst, sourceRows, b.dataList, b.container);
      }
      await applyCmsSlotListTargetDesignerPlaceholderForList(b.dataList, b.container);
    }
  });
}
