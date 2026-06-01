import { readCmsSlotListDisplayName } from "@/features/cms-slots/model/cms-slot-data-list-display";
import {
  removeCmsSlotPageRuntimeFromPage,
  syncCmsSlotPageInlineScript,
} from "@/features/cms-slots/model/cms-slot-page-inline-script";
import { type CmsSlotListOnPage, findCmsSlotListsOnPage } from "@/features/cms-slots/model/cms-slot-page-targets";
import { runExclusiveDesignerOp } from "@/features/cms-slots/model/exclusive-designer-style-op";
import {
  purgeCmsSlotListTargetDefinitionsForDataList,
  purgeCmsSlotRuntimeForDataList,
  stripEngineCodalynAttrsForSlotListContainer,
} from "@/features/cms-slots/model/site-components";
import {
  CMS_SLOTS_ROUTE_TASK_CHECKING_INSTALL,
  CMS_SLOTS_ROUTE_TASK_CREATING_INSTALL,
  CMS_SLOTS_ROUTE_TASK_MOVING_SLOT_LISTS,
  CMS_SLOTS_ROUTE_TASK_SYNCING_PAGE_SCRIPT,
  CMS_SLOTS_TOAST_LIST_REMOVED,
  CMS_SLOTS_TOAST_LIST_REMOVED_INSTALL_REMAINS,
  CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_FAILED_PREFIX,
  CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_MANUAL_SUFFIX,
  CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_NOT_FOUND,
  CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_REMOVED,
  CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_SKIPPED_NO_TOWER,
} from "@/shared/lib/cms-slots-feature-copy";

type BodyWithAppend = AnyElement & {
  append: (preset: ElementPreset<AnyElement>) => Promise<AnyElement>;
  getChildren: () => Promise<AnyElement[]>;
};

const CMS_SLOT_WRAPPER_ATTR = "data-beacon-wrapper";
const CMS_SLOT_WRAPPER_ATTR_VALUE = "beacons-wrapper";
const BEACON_WRAPPER_STYLE_NAME = "beacons-wrapper";

function getBodyElement(all: AnyElement[]): BodyWithAppend | null {
  const body = all.find((e) => e.type === "Body");
  if (!body) return null;
  if (typeof (body as { append?: unknown }).append !== "function") return null;
  if (typeof (body as { getChildren?: unknown }).getChildren !== "function") return null;
  return body as BodyWithAppend;
}

export async function findCmsSlotsWrapperOnPage(): Promise<BlockElement | null> {
  const all = await webflow.getAllElements();
  for (const el of all) {
    if (el.type !== "Block") continue;
    const block = el as BlockElement;
    const v = await block.getCustomAttribute(CMS_SLOT_WRAPPER_ATTR);
    if (v === CMS_SLOT_WRAPPER_ATTR_VALUE) return block;
  }
  return null;
}

function ensureBeaconsWrapperHiddenStyle(): Promise<Style> {
  return runExclusiveDesignerOp(async () => {
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
 * the page body. CMS slot blocks that were direct children of Body are moved into the wrapper.
 * Pushes the beacon runtime to the page via Webflow Data API **inline custom code** (footer). Idempotent for the
 * wrapper; custom code is refreshed on each install/sync.
 */
export async function installCmsSlotsWrapperOnPage(options?: { onProgress?: (message: string) => void }): Promise<{
  wrapper: BlockElement;
  created: boolean;
  reparented: number;
}> {
  const report = options?.onProgress;
  report?.(CMS_SLOTS_ROUTE_TASK_CHECKING_INSTALL);
  const found = await findCmsSlotsWrapperOnPage();
  if (found) {
    report?.(CMS_SLOTS_ROUTE_TASK_SYNCING_PAGE_SCRIPT);
    await syncCmsSlotPageInlineScript();
    return { wrapper: found, created: false, reparented: 0 };
  }

  const all = await webflow.getAllElements();
  const body = getBodyElement(all);
  if (!body) {
    throw new Error("Could not find Body on this page. Open a page in the Designer and try again.");
  }

  report?.(CMS_SLOTS_ROUTE_TASK_CREATING_INSTALL);
  const wrapper = (await body.append(webflow.elementPresets.DivBlock)) as BlockElement;
  await wrapper.setTag("div");
  await runExclusiveDesignerOp(async () => {
    const hidden = await ensureBeaconsWrapperHiddenStyle();
    await wrapper.setStyles([hidden]);
  });
  await wrapper.setCustomAttribute(CMS_SLOT_WRAPPER_ATTR, CMS_SLOT_WRAPPER_ATTR_VALUE);

  report?.(CMS_SLOTS_ROUTE_TASK_MOVING_SLOT_LISTS);
  const reparented = await reparentBodyDirectBeaconsInto(body, wrapper);
  report?.(CMS_SLOTS_ROUTE_TASK_SYNCING_PAGE_SCRIPT);
  await syncCmsSlotPageInlineScript();
  return { wrapper, created: true, reparented };
}

/** `true` when this page has the `beacons-wrapper` install (beacons must be created inside it). */
export async function isCmsSlotsWrapperInstalledOnPage(): Promise<boolean> {
  return (await findCmsSlotsWrapperOnPage()) != null;
}

/**
 * Re-registers the beacon inline script and applies it to the **current page** (Webflow Data API). Requires Tower +
 * Webflow OAuth with custom code scopes. Publish the site for live traffic.
 */
export async function syncCmsSlotsInstallEmbedOnPage(): Promise<void> {
  const wrapper = await findCmsSlotsWrapperOnPage();
  if (!wrapper) {
    throw new Error("Install beacons on this page first.");
  }
  await syncCmsSlotPageInlineScript();
}

/**
 * Beacons that are still direct children of Body (e.g. reparent into the install wrapper failed). Empty when there is
 * no issue.
 */
export type UninstallCmsSlotsPageInstallOptions = {
  /** CMS slot ids whose list-target site components should be unregistered during uninstall. */
  dataLists?: string[];
};

export type CmsSlotsPageUninstallResult = {
  wrapperRemoved: boolean;
  runtimeRemoval: Awaited<ReturnType<typeof removeCmsSlotPageRuntimeFromPage>>;
};

export type CmsSlotsDeleteBeaconNotify = {
  type: "Success" | "Warning";
  message: string;
};

/**
 * Removes the hidden `beacons-wrapper` block (if present) and the beacon **footer** runtime script from the
 * current page. Use after the last CMS slot is deleted, when the user opts to uninstall the page install.
 * Unregisters list-target site components and deletes the per-list CMS Plain Text field for every CMS slot still on
 * the page (resolved from each hidden list block before the wrapper is removed), plus the given `dataLists`.
 */
export async function uninstallCmsSlotsPageInstall(
  options?: UninstallCmsSlotsPageInstallOptions
): Promise<CmsSlotsPageUninstallResult> {
  const dataLists = new Set(options?.dataLists ?? []);
  for (const beacon of await findCmsSlotListsOnPage()) {
    dataLists.add(beacon.dataList);
    await stripEngineCodalynAttrsForSlotListContainer(beacon.container);
    await purgeCmsSlotRuntimeForDataList(beacon.dataList, beacon.container);
  }
  for (const dataList of dataLists) {
    await purgeCmsSlotListTargetDefinitionsForDataList(dataList);
  }

  const wrapper = await findCmsSlotsWrapperOnPage();
  const wrapperRemoved = wrapper != null;
  if (wrapper != null) {
    await wrapper.remove();
  }
  const runtimeRemoval = await removeCmsSlotPageRuntimeFromPage();
  return { wrapperRemoved, runtimeRemoval };
}

export function resolveCmsSlotsDeleteBeaconNotify(input: {
  shouldUninstallPage: boolean;
  wasLastBeaconOnPage: boolean;
  uninstallResult?: CmsSlotsPageUninstallResult;
}): CmsSlotsDeleteBeaconNotify {
  if (input.shouldUninstallPage) {
    const runtime = input.uninstallResult?.runtimeRemoval.status ?? "failed";
    if (runtime === "removed") {
      return { type: "Success", message: CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_REMOVED };
    }
    if (runtime === "not_found") {
      return { type: "Success", message: CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_NOT_FOUND };
    }
    if (runtime === "skipped_no_tower") {
      return { type: "Warning", message: CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_SKIPPED_NO_TOWER };
    }
    const reason =
      input.uninstallResult?.runtimeRemoval.status === "failed"
        ? input.uninstallResult.runtimeRemoval.reason
        : "Unknown error";
    return {
      type: "Warning",
      message: `${CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_FAILED_PREFIX} ${reason}. ${CMS_SLOTS_TOAST_UNINSTALL_RUNTIME_MANUAL_SUFFIX}`,
    };
  }

  if (input.wasLastBeaconOnPage) {
    return { type: "Warning", message: CMS_SLOTS_TOAST_LIST_REMOVED_INSTALL_REMAINS };
  }

  return { type: "Success", message: CMS_SLOTS_TOAST_LIST_REMOVED };
}

/**
 * When no `data-target="beacons"` lists remain, removes the hidden `beacons-wrapper` block so an empty install
 * shell is not left on the body.
 */
export async function removeCmsSlotsWrapperIfNoSlotListsOnPage(): Promise<void> {
  const targets = await findCmsSlotListsOnPage();
  if (targets.length > 0) {
    return;
  }
  const wrapper = await findCmsSlotsWrapperOnPage();
  if (wrapper != null) {
    await wrapper.remove();
  }
}

export async function listCmsSlotListsOrphanedOnBody(): Promise<CmsSlotListOnPage[]> {
  const bodyRow = (await webflow.getAllElements()).find((e) => e.type === "Body");
  if (!bodyRow) {
    return [];
  }
  const wrapper = await findCmsSlotsWrapperOnPage();
  const out: CmsSlotListOnPage[] = [];
  for (const ch of await bodyRow.getChildren()) {
    if (wrapper && ch === wrapper) continue;
    if (ch.type !== "Block") continue;
    const block = ch as BlockElement;
    const target = await block.getCustomAttribute("data-target");
    const list = await block.getCustomAttribute("data-list");
    if (target === "beacons" && list != null && list.startsWith("beacon-")) {
      const key = `${block.id.component}:${block.id.element}`;
      const displayName = await readCmsSlotListDisplayName(block);
      out.push({ dataList: list, displayName, container: block, key });
    }
  }
  return out;
}
