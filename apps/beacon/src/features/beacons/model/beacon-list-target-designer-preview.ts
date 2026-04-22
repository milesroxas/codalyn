import { listBeaconListTargetInstancesOnPage } from "@/features/beacons/model/beacon-list-target-instances-on-page";
import { findBeaconTargetsOnPage, listInstancesInBeaconTarget } from "@/features/beacons/model/beacon-page-targets";
import { getBeaconListTargetComponentOrNull } from "@/features/beacons/model/create-beacon-list-target-component";
import { runExclusiveDesignerStyleOp } from "@/features/beacons/model/exclusive-designer-style-op";

/** Slot or DOM root: accept component instances for the list-target preview. */
type ListTargetContentParent = {
  getChildren: () => Promise<AnyElement[]>;
  append: (c: Component) => Promise<unknown>;
};

function isDomContentParent(el: AnyElement | null | undefined): el is AnyElement & ListTargetContentParent {
  if (el == null) return false;
  if ((el as { children?: boolean }).children !== true) return false;
  if (typeof (el as { getChildren?: unknown }).getChildren !== "function") return false;
  if (typeof (el as { append?: unknown }).append !== "function") return false;
  return true;
}

function asSlotContentParent(slot: SlotInstanceElement): ListTargetContentParent {
  return {
    getChildren: () => slot.getChildren(),
    append: (c) => slot.append(c),
  };
}

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

/**
 * Tries the instance **slot** API first (no `enterComponent`); falls back to entering the list-target component.
 */
async function withListTargetContentRoot(
  instance: ComponentElement,
  fn: (contentRoot: ListTargetContentParent) => Promise<void>
): Promise<void> {
  const slots = await instance.getSlots();
  if (slots.length > 0) {
    await fn(asSlotContentParent(slots[0]));
    return;
  }

  if (webflow.getCurrentComponent && (await webflow.getCurrentComponent()) != null) {
    await webflow.exitComponent();
  }
  await webflow.enterComponent(instance);
  try {
    const root = await webflow.getRootElement();
    if (!isDomContentParent(root)) {
      return;
    }
    await fn(root);
  } finally {
    await webflow.exitComponent();
  }
}

async function clearListTargetInstancePreview(instance: ComponentElement): Promise<void> {
  await withListTargetContentRoot(instance, async (contentRoot) => {
    const ch = await contentRoot.getChildren();
    for (const c of ch) {
      await c.remove();
    }
  });
}

async function applyListTargetInstancePreview(
  instance: ComponentElement,
  sourceRows: Array<{ componentId: string }>
): Promise<void> {
  await withListTargetContentRoot(instance, async (contentRoot) => {
    for (const c of await contentRoot.getChildren()) {
      await c.remove();
    }
    for (const row of sourceRows) {
      const def = await webflow.getComponent(row.componentId);
      await contentRoot.append(def);
    }
  });
}

/** Mirrors the hidden beacon list’s components into the list target while mirroring is enabled. */
export async function syncBeaconListTargetDesignerPreview(
  dataList: string,
  listContainer: BlockElement
): Promise<void> {
  if (!(await shouldMirrorBeaconListInDesignerTarget())) {
    return;
  }
  if ((await getBeaconListTargetComponentOrNull(dataList, listContainer)) == null) {
    return;
  }
  const instances = await listBeaconListTargetInstancesOnPage(dataList, listContainer);
  if (instances.length === 0) {
    return;
  }
  const sourceRows = await listInstancesInBeaconTarget(listContainer);
  return runExclusiveDesignerStyleOp(async () => {
    for (const inst of instances) {
      await applyListTargetInstancePreview(inst, sourceRows);
    }
  });
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
        await clearListTargetInstancePreview(inst);
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
        await applyListTargetInstancePreview(inst, sourceRows);
      }
    }
  });
}
