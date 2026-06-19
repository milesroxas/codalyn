import { sanitizeSlotLabelForPayload } from "@/features/cms-slots/model/cms-slot-list-runtime-payload";

/** Hidden CMS slot block: user-facing slot name (independent of slugified `data-list`). */
const CMS_SLOT_LIST_DISPLAY_NAME_ATTR = "data-beacon-display-name";

/**
 * Webflow `setCustomAttribute` rejects values containing double quotes, but a slot display name is free-form user
 * text that may contain any character. The label is base64-encoded behind a `b64:` marker on write and decoded on
 * read; legacy values written before encoding (plain text, no marker) are returned verbatim so existing slots keep
 * their names. Mirrors `encodeSlotPropsAttrValue` in `cms-slot-designer-slot-props`.
 */
const DISPLAY_NAME_B64_PREFIX = "b64:";

export function encodeDisplayNameAttrValue(label: string): string {
  const bytes = new TextEncoder().encode(label);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `${DISPLAY_NAME_B64_PREFIX}${btoa(binary)}`;
}

export function decodeDisplayNameAttrValue(raw: string): string {
  if (!raw.startsWith(DISPLAY_NAME_B64_PREFIX)) {
    return raw;
  }
  const encoded = raw.slice(DISPLAY_NAME_B64_PREFIX.length);
  try {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return raw;
  }
}

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
  const sanitized = sanitizeSlotLabelForPayload(decodeDisplayNameAttrValue(raw));
  return sanitized !== "" ? sanitized : null;
}

export async function writeCmsSlotListDisplayName(container: BlockElement, displayName: string): Promise<void> {
  const sanitized = sanitizeSlotLabelForPayload(displayName.trim());
  if (sanitized === "") {
    await container.removeCustomAttribute(CMS_SLOT_LIST_DISPLAY_NAME_ATTR);
    return;
  }
  await container.setCustomAttribute(CMS_SLOT_LIST_DISPLAY_NAME_ATTR, encodeDisplayNameAttrValue(sanitized));
}
