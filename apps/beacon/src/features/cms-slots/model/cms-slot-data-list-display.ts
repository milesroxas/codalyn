import { sanitizeSlotLabelForPayload } from "@/features/cms-slots/model/cms-slot-list-runtime-payload";

/** Hidden CMS slot block: user-facing slot name (independent of slugified `data-list`). */
const CMS_SLOT_LIST_DISPLAY_NAME_ATTR = "data-beacon-display-name";

/** User-facing label for a beacon `dataList` (strips the `beacon-` prefix when present). */
export function displayLabelForDataList(dataList: string): string {
  if (dataList.startsWith("beacon-")) {
    return dataList.slice("beacon-".length);
  }
  return dataList;
}

export type CmsSlotListDisplaySource = {
  dataList: string;
  displayName?: string | null;
};

/** Prefer persisted rename label; fall back to slug-derived label for legacy lists. */
export function displayLabelForCmsSlotList(entry: CmsSlotListDisplaySource): string {
  if (entry.displayName != null) {
    const persisted = sanitizeSlotLabelForPayload(entry.displayName);
    if (persisted !== "") {
      return persisted;
    }
  }
  return displayLabelForDataList(entry.dataList);
}

export async function readCmsSlotListDisplayName(container: BlockElement): Promise<string | null> {
  const raw = await container.getCustomAttribute(CMS_SLOT_LIST_DISPLAY_NAME_ATTR);
  if (raw == null) {
    return null;
  }
  const sanitized = sanitizeSlotLabelForPayload(raw);
  return sanitized !== "" ? sanitized : null;
}

export async function writeCmsSlotListDisplayName(container: BlockElement, displayName: string): Promise<void> {
  const sanitized = sanitizeSlotLabelForPayload(displayName.trim());
  if (sanitized === "") {
    await container.removeCustomAttribute(CMS_SLOT_LIST_DISPLAY_NAME_ATTR);
    return;
  }
  await container.setCustomAttribute(CMS_SLOT_LIST_DISPLAY_NAME_ATTR, sanitized);
}
