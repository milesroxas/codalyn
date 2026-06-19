import { WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import {
  BEACON_EXPORT_HEIGHT_ATTR,
  BEACON_EXPORT_WIDTH_ATTR,
} from "@/features/image-editor/lib/beacon-designer-image-export-attrs";
import {
  findImageElementForComponentInstanceProp,
  imageElementMatchesComponentImageProp,
} from "@/features/image-editor/lib/find-image-element-for-component-instance-prop";
import type { ComponentInstanceImageProp } from "@/features/image-editor/lib/search-component-instance-image-props";
import {
  readWebflowElementChildren,
  walkWebflowStructureBfs,
} from "@/features/image-editor/lib/webflow-element-structure-walk";
import {
  type CmsSlotStringComponentPropOptions,
  cmsSlotStringComponentPropOptions,
} from "@/shared/lib/beacon-component-string-prop";
import { MAX_DESIGNER_COMPONENT_NESTING } from "@/shared/lib/component-definition-scope";
import { nestedAliasForComponentInstance } from "@/shared/lib/nested-component-prop-alias";

export const BEACON_EXPORT_WIDTH_PROP_NAME = "Beacon export width";
const BEACON_EXPORT_HEIGHT_PROP_NAME = "Beacon export height";

type ExportDimensionPropIds = { widthPropId: string; heightPropId: string };

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

export async function getBeaconExportDimensionPropIdsOrNull(def: Component): Promise<ExportDimensionPropIds | null> {
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

/**
 * Ensures the two Beacon export `string` props exist on `def` (creating them when missing) and
 * returns their ids. Idempotent: re-runs reuse the existing props by name. Caller must hold
 * `canModifyComponents` (assert once before walking).
 */
async function ensureExportPropIdsOnComponent(def: Component): Promise<ExportDimensionPropIds> {
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

async function applyExportDimensionDefaultValuesOnDefinition(
  def: Component,
  propIds: ExportDimensionPropIds,
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
  propIds: ExportDimensionPropIds
): Promise<void> {
  await applyExportDimensionDefaultValuesOnDefinition(def, propIds, null, null);
}

async function removeExportDimensionAttributesFromImage(img: ImageElement): Promise<void> {
  if (img.customAttributes !== true) {
    return;
  }
  await img.removeCustomAttribute(BEACON_EXPORT_WIDTH_ATTR).catch(() => {});
  await img.removeCustomAttribute(BEACON_EXPORT_HEIGHT_ATTR).catch(() => {});
}

/**
 * Unbinds `data-beacon-export-*` custom attributes from every image in the definition subtree.
 * Walks public children + instance slot content but does not enter nested component definitions —
 * their props live in their own scope and are handled (or left intact) separately.
 */
async function unbindExportDimensionAttributesInDefinitionSubtree(definitionRoot: AnyElement): Promise<void> {
  await walkWebflowStructureBfs([definitionRoot], async (node) => {
    if (node.type === WEBFLOW_IMAGE_ELEMENT_TYPE) {
      await removeExportDimensionAttributesFromImage(node as ImageElement);
    }
    return "continue";
  });
}

async function removeExportPropsFromComponent(def: Component, propIds: ExportDimensionPropIds): Promise<void> {
  const removeProp = (def as { removeProp?: (propId: string) => Promise<unknown> }).removeProp;
  if (typeof removeProp !== "function") {
    throw new Error("This Webflow Designer version cannot remove component props.");
  }
  await removeProp.call(def, propIds.widthPropId);
  await removeProp.call(def, propIds.heightPropId);
}

/**
 * Fully removes the two Beacon export props from `def` and unbinds the `data-beacon-export-*` custom
 * attributes from images in its subtree. Returns `true` when props were present and removed, `false`
 * when the definition had no Beacon export props (nothing to clean up). Caller must hold
 * `canModifyComponents`.
 *
 * Counterpart to {@link ensureBeaconExportDimensionPropsOnDefinition}: used when the last preset that
 * relied on these props is deleted, so no orphaned props or bindings are left behind.
 */
export async function removeBeaconExportDimensionPropsOnDefinition(
  def: Component,
  definitionRoot: AnyElement | null
): Promise<boolean> {
  await assertCanModifyComponents();
  const propIds = await getBeaconExportDimensionPropIdsOrNull(def);
  if (propIds == null) {
    return false;
  }
  if (definitionRoot != null) {
    await unbindExportDimensionAttributesInDefinitionSubtree(definitionRoot);
  }
  await removeExportPropsFromComponent(def, propIds);
  return true;
}

const IMAGE_FIELD_NOT_FOUND_MESSAGE =
  "Could not find the image field inside this component. Make sure the image inside the component is bound to the same image field as this instance.";

type NestedBindContext = {
  /** Page-level instance whose `imagePropId` image we are tagging (used for CMS-binding matches). */
  pageInstance: ComponentElement;
  /** Top-level exposed image prop id. Nested bindings are matched back to this via `nestedAlias`. */
  imagePropId: string;
  instanceImageProps: readonly ComponentInstanceImageProp[];
  /** `"first"` binds the first image in single-image components even when no prop binding matches. */
  mode: "match" | "first";
};

/**
 * Binds an export-dimension custom attribute to a prop of the component that **directly owns** the
 * image. When the image lives in a nested component, the export props are created on the inner
 * definition and chained up through each nested instance, so Webflow accepts the binding source.
 *
 * Returns the export prop ids on `definition` that drive the bound image, or `null` when no
 * matching image is found in this subtree.
 */
async function bindExportPropsForImageInDefinition(
  root: AnyElement,
  definition: Component,
  nestedAlias: ReadonlyMap<string, string>,
  nestedDepth: number,
  ctx: NestedBindContext
): Promise<ExportDimensionPropIds | null> {
  if (root.type === WEBFLOW_IMAGE_ELEMENT_TYPE) {
    return bindMatchingImageNode(root as ImageElement, definition, nestedAlias, ctx);
  }
  if (root.type === "ComponentInstance") {
    return bindThroughComponentInstance(root as ComponentElement, definition, nestedAlias, nestedDepth, ctx);
  }
  for (const child of await readWebflowElementChildren(root)) {
    const ids = await bindExportPropsForImageInDefinition(child, definition, nestedAlias, nestedDepth, ctx);
    if (ids != null) {
      return ids;
    }
  }
  return null;
}

async function bindMatchingImageNode(
  img: ImageElement,
  definition: Component,
  nestedAlias: ReadonlyMap<string, string>,
  ctx: NestedBindContext
): Promise<ExportDimensionPropIds | null> {
  const isMatch =
    ctx.mode === "first" ||
    (await imageElementMatchesComponentImageProp(
      ctx.pageInstance,
      img,
      ctx.imagePropId,
      ctx.instanceImageProps,
      nestedAlias
    ));
  if (!isMatch) {
    return null;
  }
  const ids = await ensureExportPropIdsOnComponent(definition);
  await bindExportDimensionAttributesOnImage(img, ids.widthPropId, ids.heightPropId);
  return ids;
}

async function bindThroughComponentInstance(
  inst: ComponentElement,
  definition: Component,
  nestedAlias: ReadonlyMap<string, string>,
  nestedDepth: number,
  ctx: NestedBindContext
): Promise<ExportDimensionPropIds | null> {
  const slots = await inst.getSlots().catch(() => [] as SlotInstanceElement[]);
  for (const slot of slots) {
    for (const child of await readWebflowElementChildren(slot as unknown as AnyElement)) {
      const ids = await bindExportPropsForImageInDefinition(child, definition, nestedAlias, nestedDepth, ctx);
      if (ids != null) {
        return ids;
      }
    }
  }

  if (nestedDepth >= MAX_DESIGNER_COMPONENT_NESTING) {
    return null;
  }
  const link = await nestedAliasForComponentInstance(inst, new Set([ctx.imagePropId]), nestedAlias);
  if (link.size === 0) {
    return null;
  }
  const mergedAlias = new Map(nestedAlias);
  for (const [key, value] of link) {
    mergedAlias.set(key, value);
  }

  const childIds = await bindInsideNestedDefinition(inst, mergedAlias, nestedDepth + 1, ctx);
  if (childIds == null) {
    return null;
  }

  // Back in the parent definition scope: create the matching props here and feed the nested
  // instance's props from them, so the nested image's binding source resolves up the chain.
  const parentIds = await ensureExportPropIdsOnComponent(definition);
  await inst.setProps([
    { propId: childIds.widthPropId, value: { sourceType: "prop", propId: parentIds.widthPropId } },
    { propId: childIds.heightPropId, value: { sourceType: "prop", propId: parentIds.heightPropId } },
  ]);
  return parentIds;
}

async function bindInsideNestedDefinition(
  inst: ComponentElement,
  mergedAlias: ReadonlyMap<string, string>,
  nestedDepth: number,
  ctx: NestedBindContext
): Promise<ExportDimensionPropIds | null> {
  let entered = false;
  try {
    await webflow.enterComponent(inst);
    entered = true;
  } catch {
    return null;
  }
  try {
    const childDef = await webflow.getCurrentComponent();
    if (childDef == null) {
      return null;
    }
    const childRoot = await childDef.getRootElement().catch(() => null);
    if (childRoot == null) {
      return null;
    }
    return await bindExportPropsForImageInDefinition(childRoot, childDef, mergedAlias, nestedDepth, ctx);
  } finally {
    if (entered) {
      await webflow.exitComponent().catch(() => undefined);
    }
  }
}

/**
 * Creates two `string` props on the component (when missing) and binds
 * `data-beacon-export-width` / `data-beacon-export-height` to them via
 * `ImageElement.setSettings({ attributes })` (see Webflow setSettings for custom attributes).
 *
 * When the bound image lives inside a nested component, the props are created on the inner
 * definition and chained up through each nested instance. The returned ids always belong to the
 * top-level `def`, so callers can set per-instance values or definition defaults on it.
 */
export async function ensureBeaconExportDimensionPropsOnDefinition(
  def: Component,
  instance: ComponentElement,
  imagePropId: string,
  definitionRoot: AnyElement | null,
  instanceImageProps: readonly ComponentInstanceImageProp[],
  options?: { defaultValues?: { width: string; height: string } }
): Promise<ExportDimensionPropIds> {
  await assertCanModifyComponents();

  const propIds = await bindExportPropsForImage(def, instance, imagePropId, definitionRoot, instanceImageProps);

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

async function bindExportPropsForImage(
  def: Component,
  instance: ComponentElement,
  imagePropId: string,
  definitionRoot: AnyElement | null,
  instanceImageProps: readonly ComponentInstanceImageProp[]
): Promise<ExportDimensionPropIds> {
  if (definitionRoot != null) {
    const baseCtx: NestedBindContext = { pageInstance: instance, imagePropId, instanceImageProps, mode: "match" };
    const matched = await bindExportPropsForImageInDefinition(definitionRoot, def, new Map(), 0, baseCtx);
    if (matched != null) {
      return matched;
    }
    if (instanceImageProps.length === 1) {
      const firstCtx: NestedBindContext = { ...baseCtx, mode: "first" };
      const first = await bindExportPropsForImageInDefinition(definitionRoot, def, new Map(), 0, firstCtx);
      if (first != null) {
        return first;
      }
    }
    throw new Error(IMAGE_FIELD_NOT_FOUND_MESSAGE);
  }

  // No definition root available: fall back to a single-level bind on the entered definition.
  const propIds = await ensureExportPropIdsOnComponent(def);
  const img = await findImageElementForComponentInstanceProp(instance, imagePropId, {
    definitionRoot,
    instanceImageProps,
  });
  if (img == null) {
    throw new Error(IMAGE_FIELD_NOT_FOUND_MESSAGE);
  }
  await bindExportDimensionAttributesOnImage(img, propIds.widthPropId, propIds.heightPropId);
  return propIds;
}
