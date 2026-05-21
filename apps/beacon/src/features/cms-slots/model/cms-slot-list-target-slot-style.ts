import { CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_LABEL } from "@/features/cms-slots/model/cms-slot-list-target-designer-placeholder";
import { runExclusiveDesignerStyleOp } from "@/features/cms-slots/model/exclusive-designer-style-op";

/**
 * Class removed on live reveal: backup chrome when inline placeholder styles are absent. Prefer
 * {@link applyCmsSlotListTargetDesignerPlaceholderToDom} in the Designer; the runtime strips both the class and
 * inline placeholder keys.
 */
export const CMS_SLOT_LIST_RENDER_TARGET_SLOT_STYLE_NAME = "beacon_list_render";

/**
 * Not attached in the Designer (would collapse the placeholder). Ensured in the project stylesheet and applied on the
 * published page by the beacon runtime in {@link cmsSlotListTargetRuntimeLayoutRevealSource}.
 */
export const CMS_SLOT_LIST_RENDER_LAYOUT_STYLE_NAME = "beacon_list_layout";

async function applyBeaconListTargetChromeStyleProperties(style: Style): Promise<void> {
  await style.setProperties({
    "box-sizing": "border-box",
    color: "transparent",
    "font-size": "0",
    "line-height": "0",
    overflow: "hidden",
    border: "1px dashed rgba(0, 0, 0, 0.25)",
    "background-color": "rgba(0, 0, 0, 0.04)",
  });
  try {
    await style.setProperties(
      {
        content: `"${CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_LABEL}"`,
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        "font-size": "12px",
        "line-height": "1.2",
        color: "rgba(0, 0, 0, 0.45)",
        "pointer-events": "none",
        "white-space": "nowrap",
      },
      { pseudo: "before" }
    );
    await style.setProperty("position", "relative");
  } catch {
    /* ::before pseudo may be unavailable in some Designer contexts */
  }
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
        await applyBeaconListTargetChromeStyleProperties(s);
        return s;
      }
    }
    const created = await webflow.createStyle(CMS_SLOT_LIST_RENDER_TARGET_SLOT_STYLE_NAME);
    await applyBeaconListTargetChromeStyleProperties(created);
    return created;
  });
}

/** Minified snippet embedded in {@link getCmsSlotPageInlineScriptSource} (`bListTargetReveal`). */
export function cmsSlotListTargetRuntimeLayoutRevealSource(): string {
  return `target.classList.add("${CMS_SLOT_LIST_RENDER_LAYOUT_STYLE_NAME}");target.style.setProperty("display","contents","important");`;
}

/**
 * Ensures **`beacon_list_layout`** exists in the site stylesheet (`display: contents !important`). Do not attach this
 * class in the Designer — the runtime adds it on reveal.
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
