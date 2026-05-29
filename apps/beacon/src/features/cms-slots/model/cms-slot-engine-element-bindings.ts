/** Webflow Designer `Image` nodes expose bindings via `searchSettings`, not `getSettings`. */
export const CMS_SLOT_WEBFLOW_IMAGE_ELEMENT_TYPE = "Image" as const;

/** Webflow element setting key that holds conditional visibility (a binding when conditional). */
export const CMS_SLOT_VISIBILITY_SETTING_KEY = "visibility";

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
 * Raw Designer settings for a node: `getSettings()` on DOM/text nodes; `searchSettings()` on Image nodes.
 * Returns `null` for nodes that expose neither binding API.
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

/** Classified element bindings: content settings (for tagging) vs the raw `visibility` setting (for conditionals). */
export type ElementBindingClassification = {
  /** Setting-key -> value, excluding the `visibility` setting. */
  content: Record<string, unknown>;
  /** The element's `visibility` setting value (binding, static, or null) when the node exposes settings. */
  visibility: unknown;
};

function splitVisibilityFromSettings(record: Record<string, unknown>): ElementBindingClassification {
  const content: Record<string, unknown> = {};
  let visibility: unknown;
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() === CMS_SLOT_VISIBILITY_SETTING_KEY) {
      visibility = value;
      continue;
    }
    content[key] = value;
  }
  return { content, visibility };
}

/**
 * Splits a node's Designer settings into content bindings (tagging input) and its conditional-visibility setting.
 * Returns `null` for nodes that expose no binding API.
 */
export async function classifyElementBindings(el: AnyElement): Promise<ElementBindingClassification | null> {
  const settings = await resolveElementBindingsSettings(el);
  if (settings == null) {
    return null;
  }
  return splitVisibilityFromSettings(settings);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** True when the `visibility` setting is bound (conditional), i.e. a non-static binding value. */
export function isConditionalVisibilityValue(visibility: unknown): boolean {
  if (!isRecord(visibility)) {
    return false;
  }
  const sourceType = visibility.sourceType;
  return typeof sourceType === "string" && sourceType !== "static";
}
