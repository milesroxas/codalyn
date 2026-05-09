import { instanceMatchesCmsSlotListTargetSurface } from "@/features/cms-slots/model/cms-slot-list-target-instance-surface";
import {
  CMS_SLOT_UTILITIES_COMPONENT_GROUP,
  getCmsSlotListTargetComponentOrNull,
} from "@/features/cms-slots/model/create-cms-slot-list-target-component";

export type ListCmsSlotListTargetInstancesOnPageOptions = {
  /**
   * Stop after this many list-target instances that pass the mirror surface check.
   * Use `1` for cheap “any on canvas” checks: each check calls `enterComponent` / `exitComponent` (see
   * {@link instanceMatchesCmsSlotListTargetSurface}).
   */
  maxMatches?: number;
  /** Same as {@link getCmsSlotListTargetComponentOrNull} third argument (fresh id after create). */
  preferredDefinitionId?: string | null;
};

/**
 * Resolves the current list-renderer’s registered name + group, then finds every **Component** instance on the
 * **current** page where `getComponent()` matches that name and group. Uses name/group (the stable identity in the
 * UI) instead of `Component.id` comparison, which can diverge from instance `getComponent().id` in practice.
 */
export async function listCmsSlotListTargetInstancesOnPage(
  dataList: string,
  listContainer: BlockElement,
  options?: ListCmsSlotListTargetInstancesOnPageOptions
): Promise<ComponentElement[]> {
  const listTarget = await getCmsSlotListTargetComponentOrNull(dataList, listContainer, options?.preferredDefinitionId);
  if (listTarget == null) {
    return [];
  }
  const expectedName = await listTarget.getName();
  const expectedGroup = (await listTarget.getSettings()).group;
  if (expectedGroup !== CMS_SLOT_UTILITIES_COMPONENT_GROUP) {
    return [];
  }

  const all = await webflow.getAllElements();
  const out: ComponentElement[] = [];
  const cap = options?.maxMatches;

  for (const el of all) {
    if (el.type !== "ComponentInstance") {
      continue;
    }
    const inst = el as ComponentElement;
    const c = await inst.getComponent();
    if ((await c.getName()) !== expectedName) {
      continue;
    }
    if ((await c.getSettings()).group !== expectedGroup) {
      continue;
    }
    if (await instanceMatchesCmsSlotListTargetSurface(inst, dataList, listContainer)) {
      out.push(inst);
      if (cap != null && out.length >= cap) {
        break;
      }
    }
  }
  return out;
}

/**
 * Deletes every list-target (Beacon Utilities) **instance** on the current page for this beacon list. Call **before**
 * {@link webflow.unregisterComponent} on that list-target definition so the canvas is not left with broken instances
 * and a new list target can be registered cleanly.
 */
export async function removeAllCmsSlotListTargetInstancesOnPage(
  dataList: string,
  listContainer: BlockElement,
  options?: ListCmsSlotListTargetInstancesOnPageOptions
): Promise<void> {
  const instances = await listCmsSlotListTargetInstancesOnPage(dataList, listContainer, options);
  for (const inst of instances) {
    try {
      await inst.remove();
    } catch (e) {
      console.warn("[beacon] remove list target instance failed (non-fatal):", e);
    }
  }
}

/**
 * True when a component instance on the current page matches the list-target by name/group.
 * Skips the mirror-surface check (no `enterComponent` / `exitComponent`) — for Composer list eligibility
 * and other read-only gating. Engine flows that need a precise match use
 * {@link listCmsSlotListTargetInstancesOnPage} instead.
 */
export async function hasCmsSlotListTargetInstanceOnPageByName(
  dataList: string,
  listContainer: BlockElement
): Promise<boolean> {
  const listTarget = await getCmsSlotListTargetComponentOrNull(dataList, listContainer);
  if (listTarget == null) {
    return false;
  }
  const expectedName = await listTarget.getName();
  const expectedGroup = (await listTarget.getSettings()).group;
  if (expectedGroup !== CMS_SLOT_UTILITIES_COMPONENT_GROUP) {
    return false;
  }

  const all = await webflow.getAllElements();
  for (const el of all) {
    if (el.type !== "ComponentInstance") {
      continue;
    }
    const inst = el as ComponentElement;
    const c = await inst.getComponent();
    if ((await c.getName()) !== expectedName) {
      continue;
    }
    if ((await c.getSettings()).group !== expectedGroup) {
      continue;
    }
    return true;
  }
  return false;
}
