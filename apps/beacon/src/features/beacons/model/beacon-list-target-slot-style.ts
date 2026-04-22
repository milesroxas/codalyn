import { runExclusiveDesignerStyleOp } from "@/features/beacons/model/exclusive-designer-style-op";

/**
 * Class for the **list render target** component root (`div` with this class) — not the hidden beacon list
 * blocks in `beacons-wrapper`. Empty-slot look in the Designer: dotted border, subtle fill, flex grow.
 */
export const BEACON_LIST_RENDER_TARGET_SLOT_STYLE_NAME = "beacon_list_render";

async function applyBeaconListTargetSlotStyleProperties(style: Style): Promise<void> {
  await style.setProperties({
    display: "block",
    width: "100%",
    height: "100%",
    "box-sizing": "border-box",
    border: "1px dotted rgba(0, 0, 0, 0.22)",
    "background-color": "rgba(0, 0, 0, 0.04)",
    flex: "1 1 0%",
    "min-width": "0",
    "align-self": "stretch",
  });
}

/**
 * Ensures the site has the **`beacon_list_render`** class (list render target only): dotted border, light fill, and
 * flex-friendly sizing so the target reads as an empty slot and grows when the parent is flex or grid.
 */
export function ensureBeaconListTargetSlotStyle(): Promise<Style> {
  return runExclusiveDesignerStyleOp(async () => {
    const all = await webflow.getAllStyles();
    for (const s of all) {
      if ((await s.getName()) === BEACON_LIST_RENDER_TARGET_SLOT_STYLE_NAME) {
        /** Re-applying every open/create raced the style store; existing class is enough for new targets. */
        return s;
      }
    }
    const created = await webflow.createStyle(BEACON_LIST_RENDER_TARGET_SLOT_STYLE_NAME);
    await applyBeaconListTargetSlotStyleProperties(created);
    return created;
  });
}
