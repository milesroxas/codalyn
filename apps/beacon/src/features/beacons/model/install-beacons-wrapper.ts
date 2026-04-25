import {
  removeBeaconPageRuntimeFromPage,
  syncBeaconPageInlineScript,
} from "@/features/beacons/model/beacon-page-inline-script";
import { findBeaconTargetsOnPage, type BeaconOnPage } from "@/features/beacons/model/beacon-page-targets";
import { runExclusiveDesignerStyleOp } from "@/features/beacons/model/exclusive-designer-style-op";

type BodyWithAppend = AnyElement & {
  append: (preset: ElementPreset<AnyElement>) => Promise<AnyElement>;
  getChildren: () => Promise<AnyElement[]>;
};

const BEACON_WRAPPER_ATTR = "data-beacon-wrapper";
const BEACON_WRAPPER_ATTR_VALUE = "beacons-wrapper";
const BEACON_WRAPPER_STYLE_NAME = "beacons-wrapper";

function getBodyElement(all: AnyElement[]): BodyWithAppend | null {
  const body = all.find((e) => e.type === "Body");
  if (!body) return null;
  if (typeof (body as { append?: unknown }).append !== "function") return null;
  if (typeof (body as { getChildren?: unknown }).getChildren !== "function") return null;
  return body as BodyWithAppend;
}

export async function findBeaconsWrapperOnPage(): Promise<BlockElement | null> {
  const all = await webflow.getAllElements();
  for (const el of all) {
    if (el.type !== "Block") continue;
    const block = el as BlockElement;
    const v = await block.getCustomAttribute(BEACON_WRAPPER_ATTR);
    if (v === BEACON_WRAPPER_ATTR_VALUE) return block;
  }
  return null;
}

function ensureBeaconsWrapperHiddenStyle(): Promise<Style> {
  return runExclusiveDesignerStyleOp(async () => {
    const all = await webflow.getAllStyles();
    for (const s of all) {
      if ((await s.getName()) === BEACON_WRAPPER_STYLE_NAME) {
        return s;
      }
    }
    const created = await webflow.createStyle(BEACON_WRAPPER_STYLE_NAME);
    await created.setProperty("display", "none");
    return created;
  });
}

async function reparentBodyDirectBeaconsInto(body: BodyWithAppend, wrapper: BlockElement): Promise<number> {
  let reparented = 0;
  for (const ch of await body.getChildren()) {
    if (ch === wrapper) continue;
    if (ch.type !== "Block") continue;
    const block = ch as BlockElement;
    const target = await block.getCustomAttribute("data-target");
    const list = await block.getCustomAttribute("data-list");
    if (target !== "beacons" || list == null || !list.startsWith("beacon-")) continue;
    try {
      await wrapper.append(ch);
      reparented += 1;
    } catch {
      /* Designer may block some moves; leave target on body */
    }
  }
  return reparented;
}

/**
 * Installs a hidden **`beacons-wrapper`** div (class style `beacons-wrapper`, `display: none`) at the end of
 * the page body. Beacon list blocks that were direct children of Body are moved into the wrapper.
 * Pushes the beacon runtime to the page via Webflow Data API **inline custom code** (footer). Idempotent for the
 * wrapper; custom code is refreshed on each install/sync.
 */
export async function installBeaconsWrapperOnPage(): Promise<{
  wrapper: BlockElement;
  created: boolean;
  reparented: number;
}> {
  const found = await findBeaconsWrapperOnPage();
  if (found) {
    await syncBeaconPageInlineScript();
    return { wrapper: found, created: false, reparented: 0 };
  }

  const all = await webflow.getAllElements();
  const body = getBodyElement(all);
  if (!body) {
    throw new Error("Could not find Body on this page. Open a page in the Designer and try again.");
  }

  const wrapper = (await body.append(webflow.elementPresets.DivBlock)) as BlockElement;
  await wrapper.setTag("div");
  await runExclusiveDesignerStyleOp(async () => {
    const hidden = await ensureBeaconsWrapperHiddenStyle();
    await wrapper.setStyles([hidden]);
  });
  await wrapper.setCustomAttribute(BEACON_WRAPPER_ATTR, BEACON_WRAPPER_ATTR_VALUE);

  const reparented = await reparentBodyDirectBeaconsInto(body, wrapper);
  await syncBeaconPageInlineScript();
  return { wrapper, created: true, reparented };
}

/** `true` when this page has the `beacons-wrapper` install (beacons must be created inside it). */
export async function isBeaconsWrapperInstalledOnPage(): Promise<boolean> {
  return (await findBeaconsWrapperOnPage()) != null;
}

/**
 * Re-registers the beacon inline script and applies it to the **current page** (Webflow Data API). Requires Tower +
 * Webflow OAuth with custom code scopes. Publish the site for live traffic.
 */
export async function syncBeaconsInstallEmbedOnPage(): Promise<void> {
  const wrapper = await findBeaconsWrapperOnPage();
  if (!wrapper) {
    throw new Error("Install beacons on this page first.");
  }
  await syncBeaconPageInlineScript();
}

/**
 * Beacons that are still direct children of Body (e.g. reparent into the install wrapper failed). Empty when there is
 * no issue.
 */
/**
 * Removes the hidden `beacons-wrapper` block (if present) and the beacon **footer** runtime script from the
 * current page. Use after the last beacon list is deleted, when the user opts to uninstall the page install.
 */
export async function uninstallBeaconsPageInstall(): Promise<void> {
  const wrapper = await findBeaconsWrapperOnPage();
  if (wrapper != null) {
    await wrapper.remove();
  }
  await removeBeaconPageRuntimeFromPage();
}

/**
 * When no `data-target="beacons"` lists remain, removes the hidden `beacons-wrapper` block so an empty install
 * shell is not left on the body.
 */
export async function removeBeaconsWrapperIfNoBeaconTargetsOnPage(): Promise<void> {
  const targets = await findBeaconTargetsOnPage();
  if (targets.length > 0) {
    return;
  }
  const wrapper = await findBeaconsWrapperOnPage();
  if (wrapper != null) {
    await wrapper.remove();
  }
}

export async function listBeaconsOrphanedOnBody(): Promise<BeaconOnPage[]> {
  const bodyRow = (await webflow.getAllElements()).find((e) => e.type === "Body");
  if (!bodyRow) {
    return [];
  }
  const wrapper = await findBeaconsWrapperOnPage();
  const out: BeaconOnPage[] = [];
  for (const ch of await bodyRow.getChildren()) {
    if (wrapper && ch === wrapper) continue;
    if (ch.type !== "Block") continue;
    const block = ch as BlockElement;
    const target = await block.getCustomAttribute("data-target");
    const list = await block.getCustomAttribute("data-list");
    if (target === "beacons" && list != null && list.startsWith("beacon-")) {
      const key = `${block.id.component}:${block.id.element}`;
      out.push({ dataList: list, container: block, key });
    }
  }
  return out;
}
