import { runExclusiveDesignerStyleOp } from "@/features/cms-slots/model/exclusive-designer-style-op";

/**
 * Class removed on live reveal: dotted border / fill for an empty-slot hint in the Designer.
 * Do not set `display` here — the runtime strips this class when the list is shown so placeholder
 * chrome does not ship; {@link CMS_SLOT_LIST_RENDER_LAYOUT_STYLE_NAME} stays on the element.
 */
export const CMS_SLOT_LIST_RENDER_TARGET_SLOT_STYLE_NAME = "beacon_list_render";

/** Persists after live reveal: `display: contents` so cloned rows join ancestor flex/grid layout. */
export const CMS_SLOT_LIST_RENDER_LAYOUT_STYLE_NAME = "beacon_list_layout";

async function applyBeaconListTargetChromeStyleProperties(style: Style): Promise<void> {
  await style.setProperties({
    "box-sizing": "border-box",
    border: "1px dotted rgba(0, 0, 0, 0.22)",
    "background-color": "rgba(0, 0, 0, 0.04)",
  });
}

async function applyBeaconListTargetLayoutStyleProperties(style: Style): Promise<void> {
  await style.setProperties({
    display: "contents !important",
  });
}

/**
 * Ensures **`beacon_list_render`** exists (Designer-only list-target chrome).
 */
export function ensureCmsSlotListTargetSlotStyle(): Promise<Style> {
  return runExclusiveDesignerStyleOp(async () => {
    const all = await webflow.getAllStyles();
    for (const s of all) {
      if ((await s.getName()) === CMS_SLOT_LIST_RENDER_TARGET_SLOT_STYLE_NAME) {
        /** Re-applying every open/create raced the style store; existing class is enough for new targets. */
        return s;
      }
    }
    const created = await webflow.createStyle(CMS_SLOT_LIST_RENDER_TARGET_SLOT_STYLE_NAME);
    await applyBeaconListTargetChromeStyleProperties(created);
    return created;
  });
}

/**
 * Ensures **`beacon_list_layout`** exists (`display: contents !important`, not removed by the runtime).
 */
export function ensureCmsSlotListTargetLayoutStyle(): Promise<Style> {
  return runExclusiveDesignerStyleOp(async () => {
    const all = await webflow.getAllStyles();
    for (const s of all) {
      if ((await s.getName()) === CMS_SLOT_LIST_RENDER_LAYOUT_STYLE_NAME) {
        return s;
      }
    }
    const created = await webflow.createStyle(CMS_SLOT_LIST_RENDER_LAYOUT_STYLE_NAME);
    await applyBeaconListTargetLayoutStyleProperties(created);
    return created;
  });
}
