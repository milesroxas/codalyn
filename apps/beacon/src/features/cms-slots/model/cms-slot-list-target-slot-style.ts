import {
  CMS_SLOT_LIST_TARGET_CANVAS_LABEL_ATTR,
  CMS_SLOT_LIST_TARGET_DESIGNER_CHROME,
  CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_LABEL,
} from "@/features/cms-slots/model/cms-slot-list-target-designer-placeholder";
import { runExclusiveDesignerOp } from "@/features/cms-slots/model/exclusive-designer-style-op";

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
    width: CMS_SLOT_LIST_TARGET_DESIGNER_CHROME.rootWidth,
    height: CMS_SLOT_LIST_TARGET_DESIGNER_CHROME.rootHeight,
    "min-height": CMS_SLOT_LIST_TARGET_DESIGNER_CHROME.rootMinHeight,
    "align-self": CMS_SLOT_LIST_TARGET_DESIGNER_CHROME.rootAlignSelf,
    color: "transparent",
    "font-size": "0",
    "line-height": "0",
    overflow: "hidden",
    border: CMS_SLOT_LIST_TARGET_DESIGNER_CHROME.rootBorder,
    "background-color": CMS_SLOT_LIST_TARGET_DESIGNER_CHROME.rootBackground,
    "box-shadow": CMS_SLOT_LIST_TARGET_DESIGNER_CHROME.rootBoxShadow,
  });
  try {
    await style.setProperties(
      {
        // Static prefix is the safe baseline; the per-slot name is appended below via attr().
        content: `"${CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_LABEL}"`,
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        "font-size": "11px",
        "font-weight": "600",
        "line-height": "1.3",
        color: CMS_SLOT_LIST_TARGET_DESIGNER_CHROME.labelColor,
        "background-color": CMS_SLOT_LIST_TARGET_DESIGNER_CHROME.labelBackground,
        border: CMS_SLOT_LIST_TARGET_DESIGNER_CHROME.labelBorder,
        "border-radius": "4px",
        padding: "3px 10px",
        "box-shadow": CMS_SLOT_LIST_TARGET_DESIGNER_CHROME.labelBoxShadow,
        "pointer-events": "none",
        "white-space": "nowrap",
      },
      { pseudo: "before" }
    );
    try {
      // Append each slot's own name from a per-element attribute, so the shared chrome class still shows per-slot text.
      // Done as a separate set so a Designer that rejects attr() keeps the static prefix instead of dropping the chip.
      await style.setProperty(
        "content",
        `"${CMS_SLOT_LIST_TARGET_DESIGNER_PLACEHOLDER_LABEL}" attr(${CMS_SLOT_LIST_TARGET_CANVAS_LABEL_ATTR})`,
        { pseudo: "before" }
      );
    } catch {
      /* attr() in content may be unsupported in some Designer contexts; keep the static label */
    }
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
  return runExclusiveDesignerOp(async () => {
    const all = await webflow.getAllStyles();
    // Read every style name concurrently — a serial `for…await getName()` is one bridge round-trip per style and
    // dominated create-slot latency on sites with hundreds of styles.
    const names = await Promise.all(all.map((s) => s.getName()));
    const idx = names.indexOf(CMS_SLOT_LIST_RENDER_TARGET_SLOT_STYLE_NAME);
    if (idx >= 0) {
      const existing = all[idx];
      await applyBeaconListTargetChromeStyleProperties(existing);
      return existing;
    }
    const created = await webflow.createStyle(CMS_SLOT_LIST_RENDER_TARGET_SLOT_STYLE_NAME);
    await applyBeaconListTargetChromeStyleProperties(created);
    return created;
  });
}

/** Runtime statements (readable JS) embedded in {@link getCmsSlotPageInlineScriptSource} (`bListTargetReveal`). */
export function cmsSlotListTargetRuntimeLayoutRevealSource(): string {
  return `target.classList.add("${CMS_SLOT_LIST_RENDER_LAYOUT_STYLE_NAME}");
target.style.setProperty("display", "contents", "important");
`;
}

/**
 * Ensures **`beacon_list_layout`** exists in the site stylesheet (`display: contents !important`). Do not attach this
 * class in the Designer — the runtime adds it on reveal.
 */
export function ensureCmsSlotListTargetLayoutStyle(): Promise<Style> {
  return runExclusiveDesignerOp(async () => {
    const all = await webflow.getAllStyles();
    const names = await Promise.all(all.map((s) => s.getName()));
    const idx = names.indexOf(CMS_SLOT_LIST_RENDER_LAYOUT_STYLE_NAME);
    if (idx >= 0) {
      return all[idx];
    }
    const created = await webflow.createStyle(CMS_SLOT_LIST_RENDER_LAYOUT_STYLE_NAME);
    await applyBeaconListTargetLayoutStyleProperties(created);
    return created;
  });
}
