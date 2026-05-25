import {
  BEACON_EXPORT_HEIGHT_ATTR,
  BEACON_EXPORT_WIDTH_ATTR,
} from "@/features/image-editor/lib/beacon-designer-image-export-attrs";
import { findImageElementForComponentInstanceProp } from "@/features/image-editor/lib/find-image-element-for-component-instance-prop";
import type { ComponentInstanceImageProp } from "@/features/image-editor/lib/search-component-instance-image-props";
import {
  CMS_SLOT_COMPONENT_STRING_PROPS_GROUP,
  type CmsSlotStringComponentPropOptions,
  cmsSlotStringComponentPropOptions,
} from "@/shared/lib/beacon-component-string-prop";

export const BEACON_EXPORT_WIDTH_PROP_NAME = "Beacon export width";
export const BEACON_EXPORT_HEIGHT_PROP_NAME = "Beacon export height";
export const BEACON_EXPORT_PROPS_GROUP = CMS_SLOT_COMPONENT_STRING_PROPS_GROUP;

type AttributeSettingsEntry = {
  name: string;
  value: string | { sourceType: "prop"; propId: string };
};

function mergeAttributeBindings(
  existing: Array<NamedValue> | null,
  widthPropId: string,
  heightPropId: string
): { attributes: AttributeSettingsEntry[] } {
  const out: AttributeSettingsEntry[] = [];
  const seen = new Set<string>();
  for (const row of existing ?? []) {
    seen.add(row.name);
    if (row.name === BEACON_EXPORT_WIDTH_ATTR) {
      out.push({ name: row.name, value: { sourceType: "prop", propId: widthPropId } });
    } else if (row.name === BEACON_EXPORT_HEIGHT_ATTR) {
      out.push({ name: row.name, value: { sourceType: "prop", propId: heightPropId } });
    } else {
      out.push({ name: row.name, value: row.value });
    }
  }
  if (!seen.has(BEACON_EXPORT_WIDTH_ATTR)) {
    out.push({ name: BEACON_EXPORT_WIDTH_ATTR, value: { sourceType: "prop", propId: widthPropId } });
  }
  if (!seen.has(BEACON_EXPORT_HEIGHT_ATTR)) {
    out.push({ name: BEACON_EXPORT_HEIGHT_ATTR, value: { sourceType: "prop", propId: heightPropId } });
  }
  return { attributes: out };
}

export async function getBeaconExportDimensionPropIdsOrNull(
  def: Component
): Promise<{ widthPropId: string; heightPropId: string } | null> {
  const props = await def.getProps();
  const w = props.find((p) => p.type === "string" && p.name === BEACON_EXPORT_WIDTH_PROP_NAME);
  const h = props.find((p) => p.type === "string" && p.name === BEACON_EXPORT_HEIGHT_PROP_NAME);
  if (w == null || h == null) {
    return null;
  }
  return { widthPropId: w.id, heightPropId: h.id };
}

async function assertCanModifyComponents(): Promise<void> {
  const perms = await webflow.canForAppMode([webflow.appModes.canModifyComponents]);
  if (!perms[webflow.appModes.canModifyComponents]) {
    throw new Error("Components cannot be edited in the current Designer mode.");
  }
}

async function ensureExportDimensionPropIdsOnDefinition(
  def: Component
): Promise<{ widthPropId: string; heightPropId: string }> {
  await assertCanModifyComponents();

  const props0 = await def.getProps();
  let w = props0.find((p) => p.type === "string" && p.name === BEACON_EXPORT_WIDTH_PROP_NAME);
  let h = props0.find((p) => p.type === "string" && p.name === BEACON_EXPORT_HEIGHT_PROP_NAME);

  if (w == null || h == null) {
    const toCreate: CmsSlotStringComponentPropOptions[] = [];
    if (w == null) {
      toCreate.push(cmsSlotStringComponentPropOptions(BEACON_EXPORT_WIDTH_PROP_NAME));
    }
    if (h == null) {
      toCreate.push(cmsSlotStringComponentPropOptions(BEACON_EXPORT_HEIGHT_PROP_NAME));
    }
    await def.createProps(toCreate);
    const props1 = await def.getProps();
    w = props1.find((p) => p.type === "string" && p.name === BEACON_EXPORT_WIDTH_PROP_NAME);
    h = props1.find((p) => p.type === "string" && p.name === BEACON_EXPORT_HEIGHT_PROP_NAME);
  }

  if (w == null || h == null) {
    throw new Error("Could not add Beacon export width/height fields on this component.");
  }

  return { widthPropId: w.id, heightPropId: h.id };
}

async function bindExportDimensionAttributesOnImage(
  img: ImageElement,
  widthPropId: string,
  heightPropId: string
): Promise<void> {
  if (img.customAttributes !== true) {
    throw new Error("This image does not support custom attributes in the Designer API.");
  }
  const existing = await img.getAllCustomAttributes();
  const settings = mergeAttributeBindings(existing, widthPropId, heightPropId);
  await img.setSettings(settings as SetSettingsInput);
}

export async function applyExportDimensionDefaultValuesOnDefinition(
  def: Component,
  propIds: { widthPropId: string; heightPropId: string },
  width: string | null,
  height: string | null
): Promise<void> {
  const setProp = (def as { setProp?: (id: string, updates: { defaultValue: string | null }) => Promise<unknown> })
    .setProp;
  if (typeof setProp !== "function") {
    throw new Error("This Webflow Designer version cannot set component prop defaults.");
  }
  await setProp.call(def, propIds.widthPropId, { defaultValue: width });
  await setProp.call(def, propIds.heightPropId, { defaultValue: height });
}

export async function clearExportDimensionDefaultValuesOnDefinition(
  def: Component,
  propIds: { widthPropId: string; heightPropId: string }
): Promise<void> {
  await applyExportDimensionDefaultValuesOnDefinition(def, propIds, null, null);
}

/**
 * Creates two `string` props on the component (when missing) and binds
 * `data-beacon-export-width` / `data-beacon-export-height` to them via
 * `ImageElement.setSettings({ attributes })` (see Webflow setSettings for custom attributes).
 */
export async function ensureBeaconExportDimensionPropsOnDefinition(
  def: Component,
  instance: ComponentElement,
  imagePropId: string,
  definitionRoot: AnyElement | null,
  instanceImageProps: readonly ComponentInstanceImageProp[],
  options?: { defaultValues?: { width: string; height: string } }
): Promise<{ widthPropId: string; heightPropId: string }> {
  const propIds = await ensureExportDimensionPropIdsOnDefinition(def);

  const img = await findImageElementForComponentInstanceProp(instance, imagePropId, {
    definitionRoot,
    instanceImageProps,
  });
  if (img == null) {
    throw new Error(
      "Could not find the image field inside this component. Make sure the image inside the component is bound to the same image field as this instance."
    );
  }
  await bindExportDimensionAttributesOnImage(img, propIds.widthPropId, propIds.heightPropId);
  if (options?.defaultValues != null) {
    await applyExportDimensionDefaultValuesOnDefinition(
      def,
      propIds,
      options.defaultValues.width,
      options.defaultValues.height
    );
  }
  return propIds;
}
