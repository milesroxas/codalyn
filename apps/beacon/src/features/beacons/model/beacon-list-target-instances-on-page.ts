import { instanceMatchesBeaconListTargetSurface } from "@/features/beacons/model/beacon-list-target-instance-surface";
import {
  BEACON_UTILITIES_COMPONENT_GROUP,
  getBeaconListTargetComponentOrNull,
} from "@/features/beacons/model/create-beacon-list-target-component";

export type ListBeaconListTargetInstancesOnPageOptions = {
  /**
   * Stop after this many list-target instances that pass the mirror surface check.
   * Use `1` for cheap “any on canvas” checks: each check calls `enterComponent` / `exitComponent` (see
   * {@link instanceMatchesBeaconListTargetSurface}).
   */
  maxMatches?: number;
  /** Same as {@link getBeaconListTargetComponentOrNull} third argument (fresh id after create). */
  preferredDefinitionId?: string | null;
};

/**
 * Resolves the current list-renderer’s registered name + group, then finds every **Component** instance on the
 * **current** page where `getComponent()` matches that name and group. Uses name/group (the stable identity in the
 * UI) instead of `Component.id` comparison, which can diverge from instance `getComponent().id` in practice.
 */
export async function listBeaconListTargetInstancesOnPage(
  dataList: string,
  listContainer: BlockElement,
  options?: ListBeaconListTargetInstancesOnPageOptions
): Promise<ComponentElement[]> {
  const listTarget = await getBeaconListTargetComponentOrNull(dataList, listContainer, options?.preferredDefinitionId);
  if (listTarget == null) {
    return [];
  }
  const expectedName = await listTarget.getName();
  const expectedGroup = (await listTarget.getSettings()).group;
  if (expectedGroup !== BEACON_UTILITIES_COMPONENT_GROUP) {
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
    if (await instanceMatchesBeaconListTargetSurface(inst, dataList, listContainer)) {
      out.push(inst);
      if (cap != null && out.length >= cap) {
        break;
      }
    }
  }
  return out;
}

/**
 * True when a component instance on the current page matches the list-target by name/group.
 * Skips the mirror-surface check (no `enterComponent` / `exitComponent`) — for Composer list eligibility
 * and other read-only gating. Engine flows that need a precise match use
 * {@link listBeaconListTargetInstancesOnPage} instead.
 */
export async function hasBeaconListTargetInstanceOnPageByName(
  dataList: string,
  listContainer: BlockElement
): Promise<boolean> {
  const listTarget = await getBeaconListTargetComponentOrNull(dataList, listContainer);
  if (listTarget == null) {
    return false;
  }
  const expectedName = await listTarget.getName();
  const expectedGroup = (await listTarget.getSettings()).group;
  if (expectedGroup !== BEACON_UTILITIES_COMPONENT_GROUP) {
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
