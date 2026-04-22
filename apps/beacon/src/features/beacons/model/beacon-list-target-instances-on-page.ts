import {
  BEACON_UTILITIES_COMPONENT_GROUP,
  getBeaconListTargetComponentOrNull,
} from "@/features/beacons/model/create-beacon-list-target-component";

/**
 * Resolves the current list-renderer’s registered name + group, then finds every **Component** instance on the
 * **current** page where `getComponent()` matches that name and group. Uses name/group (the stable identity in the
 * UI) instead of `Component.id` comparison, which can diverge from instance `getComponent().id` in practice.
 */
export async function listBeaconListTargetInstancesOnPage(
  dataList: string,
  listContainer: BlockElement
): Promise<ComponentElement[]> {
  const listTarget = await getBeaconListTargetComponentOrNull(dataList, listContainer);
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
    out.push(inst);
  }
  return out;
}
