/** CMS image field binding surfaced on Designer element settings / component props. */

export type CmsImageBindingRef = {
  sourceType: "cms";
  collectionId: string;
  fieldId: string;
  fieldName?: string;
};

export type ElementCmsImageBinding = {
  label: string;
  binding: CmsImageBindingRef;
};

const CMS_IMAGE_VALUE_TYPES = new Set(["image", "imageAsset", "cmsImage"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isCmsImageValueType(valueType: unknown): boolean {
  return typeof valueType === "string" && CMS_IMAGE_VALUE_TYPES.has(valueType);
}

export function asCmsBinding(value: unknown): CmsImageBindingRef | null {
  if (!isRecord(value) || value.sourceType !== "cms") {
    return null;
  }
  const collectionId = typeof value.collectionId === "string" ? value.collectionId : "";
  const fieldId = typeof value.fieldId === "string" ? value.fieldId : "";
  if (!collectionId || !fieldId) {
    return null;
  }
  return {
    sourceType: "cms",
    collectionId,
    fieldId,
    fieldName: typeof value.fieldName === "string" ? value.fieldName : undefined,
  };
}

async function findElementCmsImageBindings(element: AnyElement): Promise<ElementCmsImageBinding[]> {
  if (!("elementSettings" in element) || element.elementSettings !== true) {
    return [];
  }
  const settings = await (element as { searchSettings: () => Promise<Record<string, unknown>> }).searchSettings();
  const bindings: ElementCmsImageBinding[] = [];
  for (const setting of Object.values(settings)) {
    if (!isRecord(setting) || !isCmsImageValueType(setting.valueType)) {
      continue;
    }
    const binding = asCmsBinding(setting.value);
    if (!binding) {
      continue;
    }
    const display = isRecord(setting.display) ? setting.display : null;
    const label = typeof display?.label === "string" && display.label.trim().length > 0 ? display.label : "Image field";
    bindings.push({ label, binding });
  }
  return bindings;
}

export async function resolveSingleElementCmsImageBinding(
  element: AnyElement
): Promise<ElementCmsImageBinding | "multiple" | null> {
  const cmsBindings = await findElementCmsImageBindings(element);
  if (cmsBindings.length === 0) {
    return null;
  }
  if (cmsBindings.length > 1) {
    return "multiple";
  }
  return cmsBindings[0];
}
