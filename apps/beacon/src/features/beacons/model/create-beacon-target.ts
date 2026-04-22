import { findBeaconsWrapperOnPage } from "@/features/beacons/model/install-beacons-wrapper";

type ParentWithPrepend = AnyElement & {
  prepend: (preset: ElementPreset<AnyElement>) => Promise<AnyElement>;
};

const BEACON_TARGET_HIDDEN_STYLE_NAME = "beacon_list";

function canPrependPreset(el: AnyElement): el is ParentWithPrepend {
  return (
    typeof (el as { prepend?: unknown }).prepend === "function" && Boolean((el as { children?: boolean }).children)
  );
}

/**
 * Slug used for the `data-list` attribute, e.g. `beacon-hero-cta` from "Hero CTA".
 */
export function dataListValueForBeaconName(name: string): string {
  const t = name.trim().toLowerCase();
  const slug = t.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new Error("Use a name with at least one letter or number.");
  }
  return `beacon-${slug}`;
}

async function ensureBeaconTargetHiddenStyle(): Promise<Style> {
  const all = await webflow.getAllStyles();
  for (const s of all) {
    if ((await s.getName()) === BEACON_TARGET_HIDDEN_STYLE_NAME) {
      return s;
    }
  }
  const created = await webflow.createStyle(BEACON_TARGET_HIDDEN_STYLE_NAME);
  await created.setProperty("display", "none");
  return created;
}

/**
 * Prepends a **hidden** div **inside the installed `beacons-wrapper`** (class style **`beacon_list`**: `display: none`) as the
 * **first child** (before other beacon lists and before the install HTML embed), with:
 * - `data-target` = `beacons`
 * - `data-list` = `beacon-<slug from name>` (from {@link dataListValueForBeaconName})
 *
 * Requires {@link findBeaconsWrapperOnPage} (install the wrapper + embed first).
 */
export async function createBeaconTargetOnPage(name: string): Promise<{ container: BlockElement; dataList: string }> {
  const dataList = dataListValueForBeaconName(name);
  const parent = await findBeaconsWrapperOnPage();
  if (!parent || !canPrependPreset(parent)) {
    throw new Error("Install beacons on this page first, then add a beacon.");
  }

  const el = (await (parent as ParentWithPrepend).prepend(webflow.elementPresets.DivBlock)) as BlockElement;
  await el.setTag("div");

  const hidden = await ensureBeaconTargetHiddenStyle();
  await el.setStyles([hidden]);

  await el.setCustomAttribute("data-target", "beacons");
  await el.setCustomAttribute("data-list", dataList);

  return { container: el, dataList };
}
