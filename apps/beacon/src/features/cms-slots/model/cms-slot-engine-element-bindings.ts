/** Webflow Designer `Image` nodes expose bindings via `searchSettings`, not `getSettings`. */
export const CMS_SLOT_WEBFLOW_IMAGE_ELEMENT_TYPE = "Image" as const;

const IMAGE_SEARCH_VALUE_TYPES = ["image", "imageAsset", "cmsImage", "imageSet"] as const;

type SearchSettingsCapable = {
  searchSettings: (o?: { valueType?: string }) => Promise<Record<string, unknown>>;
};

function hasElementSettings(el: AnyElement): boolean {
  return "elementSettings" in el && (el as { elementSettings?: boolean }).elementSettings === true;
}

function hasSearchSettings(el: AnyElement): el is AnyElement & SearchSettingsCapable {
  return typeof (el as SearchSettingsCapable).searchSettings === "function";
}

/** Merges image `searchSettings` slices (same pattern as image-editor). */
export async function imageSearchSettingsRecord(el: AnyElement): Promise<Record<string, unknown>> {
  const img = el as AnyElement & SearchSettingsCapable;
  const merged: Record<string, unknown> = {};
  for (const valueType of IMAGE_SEARCH_VALUE_TYPES) {
    const chunk = await img.searchSettings({ valueType }).catch(() => ({}) as Record<string, unknown>);
    Object.assign(merged, chunk);
  }
  const all = await img.searchSettings().catch(() => ({}) as Record<string, unknown>);
  Object.assign(merged, all);
  return merged;
}

/**
 * Designer bindings for CMS slot tagging: `getSettings()` on DOM/text nodes; `searchSettings()` on Image nodes.
 */
export async function resolveElementBindingsSettings(el: AnyElement): Promise<Record<string, unknown> | null> {
  if (hasElementSettings(el)) {
    return (el as AnyElement & { getSettings: () => Promise<Record<string, unknown>> }).getSettings();
  }
  if (el.type === CMS_SLOT_WEBFLOW_IMAGE_ELEMENT_TYPE && hasSearchSettings(el)) {
    return imageSearchSettingsRecord(el);
  }
  return null;
}
