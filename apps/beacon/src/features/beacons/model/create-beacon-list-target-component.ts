/** Components panel group for Beacon utility definitions. */
export const BEACON_UTILITIES_COMPONENT_GROUP = "Beacon Utilities";

/**
 * Custom element root (must include a hyphen). Exposes the same list linkage as the hidden beacon container.
 */
export const BEACON_LIST_RENDER_TAG = "beacon-list-render";

const ID_TAIL_LENGTH = 8;

/**
 * Registers a site component under {@link BEACON_UTILITIES_COMPONENT_GROUP} whose root is a single DOM node that
 * identifies **this beacon list** (the `data-list` target), not the component instances inside the list.
 */
export async function createBeaconListTargetComponent(input: {
  dataList: string;
  listContainer: BlockElement;
}): Promise<Component> {
  const { dataList, listContainer } = input;
  const name = uniqueBeaconListTargetComponentName(dataList, listContainer);

  const root = webflow.elementBuilder(webflow.elementPresets.DOM);
  root.setTag(BEACON_LIST_RENDER_TAG);
  root.setAttribute("data-target", "beacons");
  root.setAttribute("data-list", dataList);
  root.setAttribute("data-beacon-list-element-id", listContainer.id.element);
  root.setAttribute("data-beacon-list-component-id", listContainer.id.component);
  root.setAttribute("data-beacon-target", "list");

  return webflow.registerComponent(
    {
      name,
      group: BEACON_UTILITIES_COMPONENT_GROUP,
      description: "Beacon list render target (Codalyn Beacon)",
    },
    root
  );
}

function uniqueBeaconListTargetComponentName(dataList: string, listContainer: BlockElement): string {
  const el = String(listContainer.id.element);
  const tail = el.length <= ID_TAIL_LENGTH ? el : el.slice(-ID_TAIL_LENGTH);
  return `${dataList} · ${tail}`;
}
