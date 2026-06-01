import { writeCmsSlotListDisplayName } from "@/features/cms-slots/model/cms-slot-data-list-display";
import { runExclusiveDesignerOp } from "@/features/cms-slots/model/exclusive-designer-style-op";
import { findCmsSlotsWrapperOnPage } from "@/features/cms-slots/model/install-cms-slots-wrapper";

type ParentWithPrepend = AnyElement & {
  prepend: (preset: ElementPreset<AnyElement>) => Promise<AnyElement>;
};

function canPrependPreset(el: AnyElement): el is ParentWithPrepend {
  return (
    typeof (el as { prepend?: unknown }).prepend === "function" && Boolean((el as { children?: boolean }).children)
  );
}

/**
 * Slug used for the `data-list` attribute, e.g. `beacon-hero-cta` from "Hero CTA".
 */
export function dataListValueForCmsSlotName(name: string): string {
  const t = name.trim().toLowerCase();
  const slug = t.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new Error("Use a name with at least one letter or number.");
  }
  return `beacon-${slug}`;
}

const BEACON_WRAPPER_LIST_BLOCK_STYLE_NAME = "beacon_list";

function ensureBeaconWrapperListBlockHiddenStyle(): Promise<Style> {
  return runExclusiveDesignerOp(async () => {
    const all = await webflow.getAllStyles();
    for (const s of all) {
      if ((await s.getName()) === BEACON_WRAPPER_LIST_BLOCK_STYLE_NAME) {
        return s;
      }
    }
    const created = await webflow.createStyle(BEACON_WRAPPER_LIST_BLOCK_STYLE_NAME);
    await created.setProperty("display", "none");
    return created;
  });
}

/**
 * Prepends a **hidden** div **inside the installed `beacons-wrapper`** (class style **`beacon_list`**: `display: none`) as the
 * **first child** (before other CMS slots and before the install HTML embed), with:
 * - `data-target` = `beacons`
 * - `data-list` = `beacon-<slug from name>` (from {@link dataListValueForCmsSlotName})
 *
 * Requires {@link findCmsSlotsWrapperOnPage} (install the wrapper + embed first).
 */
export async function createCmsSlotListOnPage(name: string): Promise<{ container: BlockElement; dataList: string }> {
  const dataList = dataListValueForCmsSlotName(name);
  const parent = await findCmsSlotsWrapperOnPage();
  if (!parent || !canPrependPreset(parent)) {
    throw new Error("Install beacons on this page first, then add a beacon.");
  }

  const el = (await (parent as ParentWithPrepend).prepend(webflow.elementPresets.DivBlock)) as BlockElement;
  await el.setTag("div");

  await runExclusiveDesignerOp(async () => {
    const hidden = await ensureBeaconWrapperListBlockHiddenStyle();
    await el.setStyles([hidden]);
  });

  await el.setCustomAttribute("data-target", "beacons");
  await el.setCustomAttribute("data-list", dataList);
  await writeCmsSlotListDisplayName(el, name);

  return { container: el, dataList };
}
