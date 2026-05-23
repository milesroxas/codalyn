import { WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import { asCmsBinding, type CmsImageBindingRef } from "@/features/image-editor/lib/element-cms-image-binding";
import {
  type ComponentInstanceImageProp,
  searchComponentInstanceImageProps,
} from "@/features/image-editor/lib/search-component-instance-image-props";
import {
  readWebflowElementChildren,
  walkWebflowStructureBfs,
} from "@/features/image-editor/lib/webflow-element-structure-walk";
import { MAX_DESIGNER_COMPONENT_NESTING } from "@/shared/lib/component-definition-scope";
import { runExclusiveDesignerOp } from "@/shared/lib/exclusive-designer-op";
import {
  bindingPropIdFromSettingValue,
  canonicalExposedPropId,
  nestedAliasForComponentInstance,
} from "@/shared/lib/nested-component-prop-alias";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

const IMAGE_VALUE_TYPES = ["image", "imageAsset", "cmsImage", "imageSet"] as const;
const IMAGE_SETTING_VALUE_TYPES = new Set<string>(IMAGE_VALUE_TYPES);

type SearchSettingsImage = {
  searchSettings: (o?: { valueType?: string }) => Promise<Record<string, unknown>>;
};

function cmsRefFromElementSetting(setting: unknown): CmsImageBindingRef | null {
  if (!isRecord(setting) || !IMAGE_SETTING_VALUE_TYPES.has(String(setting.valueType))) {
    return null;
  }
  return asCmsBinding(setting.value);
}

async function imageSettingsHaveCmsMatch(img: ImageElement, target: CmsImageBindingRef): Promise<boolean> {
  const withSearch = img as ImageElement & Partial<SearchSettingsImage>;
  if (typeof withSearch.searchSettings !== "function") {
    return false;
  }
  for (const valueType of IMAGE_VALUE_TYPES) {
    const settings = await withSearch.searchSettings({ valueType }).catch(() => ({}) as Record<string, unknown>);
    for (const setting of Object.values(settings)) {
      const ref = cmsRefFromElementSetting(setting);
      if (ref && ref.collectionId === target.collectionId && ref.fieldId === target.fieldId) {
        return true;
      }
    }
  }
  const all = await withSearch.searchSettings().catch(() => ({}) as Record<string, unknown>);
  for (const setting of Object.values(all)) {
    const ref = cmsRefFromElementSetting(setting);
    if (ref && ref.collectionId === target.collectionId && ref.fieldId === target.fieldId) {
      return true;
    }
  }
  return false;
}

type SearchSettingsEl = {
  searchSettings: (o?: { valueType?: (typeof IMAGE_VALUE_TYPES)[number] | string }) => Promise<Record<string, unknown>>;
};

async function collectImageBoundPropIds(img: ImageElement): Promise<string[]> {
  const withSearch = img as ImageElement & Partial<SearchSettingsEl>;
  if (typeof withSearch.searchSettings !== "function") {
    return [];
  }
  const ids: string[] = [];
  const considerSettings = (settings: Record<string, unknown>) => {
    for (const setting of Object.values(settings)) {
      const fromSetting = bindingPropIdFromSettingValue(setting);
      if (fromSetting != null) {
        ids.push(fromSetting);
      }
    }
  };
  for (const valueType of IMAGE_VALUE_TYPES) {
    const settings = await withSearch.searchSettings({ valueType }).catch(() => ({}) as Record<string, unknown>);
    considerSettings(settings);
  }
  const all = await withSearch.searchSettings().catch(() => ({}) as Record<string, unknown>);
  considerSettings(all);
  return ids;
}

export async function imageElementBindsToComponentProp(img: ImageElement, propId: string): Promise<boolean> {
  return imageElementBindsToTargetPropId(img, propId, new Map());
}

async function imageElementBindsToTargetPropId(
  img: ImageElement,
  targetPropId: string,
  nestedAlias: ReadonlyMap<string, string>
): Promise<boolean> {
  const exposedIds = new Set([targetPropId]);
  for (const boundPropId of await collectImageBoundPropIds(img)) {
    if (canonicalExposedPropId(boundPropId, exposedIds, nestedAlias) === targetPropId) {
      return true;
    }
  }
  return false;
}

function resolveInstanceImageProp(
  instanceImageProps: readonly ComponentInstanceImageProp[],
  propId: string
): ComponentInstanceImageProp | null {
  return instanceImageProps.find((prop) => prop.propId === propId) ?? null;
}

export async function imageElementMatchesComponentImageProp(
  instance: ComponentElement,
  img: ImageElement,
  propId: string,
  instanceImageProps?: readonly ComponentInstanceImageProp[],
  nestedAlias: ReadonlyMap<string, string> = new Map()
): Promise<boolean> {
  const props = instanceImageProps ?? (await searchComponentInstanceImageProps(instance));
  const prop = resolveInstanceImageProp(props, propId);
  if (prop == null) {
    return false;
  }
  const propCms = asCmsBinding(prop.value);
  if (propCms && (await imageSettingsHaveCmsMatch(img, propCms))) {
    return true;
  }
  return imageElementBindsToTargetPropId(img, prop.propId, nestedAlias);
}

export type FindComponentInstanceImageOptions = {
  /**
   * Component definition root while `enterComponent` is active. Internal images are only
   * reachable from here — BFS from the page instance alone often fails on CMS templates.
   */
  definitionRoot?: AnyElement | null;
  /** Preloaded instance props — avoids repeated Designer reads during tree walks. */
  instanceImageProps?: readonly ComponentInstanceImageProp[];
};

async function collectMatchingImagesBfs(
  startNodes: readonly AnyElement[],
  instance: ComponentElement,
  imagePropId: string,
  instanceImageProps: readonly ComponentInstanceImageProp[],
  nestedAlias: ReadonlyMap<string, string> = new Map()
): Promise<ImageElement[]> {
  const found: ImageElement[] = [];
  await walkWebflowStructureBfs(startNodes, async (node) => {
    if (node.type !== WEBFLOW_IMAGE_ELEMENT_TYPE) {
      return "continue";
    }
    const img = node as ImageElement;
    if (await imageElementMatchesComponentImageProp(instance, img, imagePropId, instanceImageProps, nestedAlias)) {
      found.push(img);
    }
    return "continue";
  });
  return found;
}

async function findFirstImageDescendantBfs(startNodes: readonly AnyElement[]): Promise<ImageElement | null> {
  let found: ImageElement | null = null;
  await walkWebflowStructureBfs(startNodes, async (node) => {
    if (node.type !== WEBFLOW_IMAGE_ELEMENT_TYPE) {
      return "continue";
    }
    found = node as ImageElement;
    return "stop";
  });
  return found;
}

type DefinitionImageWalkContext = {
  pageInstance: ComponentElement;
  imagePropId: string;
  instanceImageProps: readonly ComponentInstanceImageProp[];
  nestedAlias: ReadonlyMap<string, string>;
  nestedDepth: number;
  found: ImageElement[];
  mode: "match" | "first";
};

function shouldStopFirstModeWalk(ctx: DefinitionImageWalkContext): boolean {
  return ctx.mode === "first" && ctx.found.length > 0;
}

async function enterNestedDefinitionIfImagePropLinked(
  inst: ComponentElement,
  ctx: DefinitionImageWalkContext,
  visit: (root: AnyElement, nestedAlias: ReadonlyMap<string, string>, nestedDepth: number) => Promise<void>
): Promise<void> {
  if (ctx.nestedDepth >= MAX_DESIGNER_COMPONENT_NESTING) {
    return;
  }
  const exposedIds = new Set([ctx.imagePropId]);
  const link = await nestedAliasForComponentInstance(inst, exposedIds, ctx.nestedAlias);
  if (link.size === 0) {
    return;
  }
  const merged = new Map(ctx.nestedAlias);
  for (const [key, value] of link) {
    merged.set(key, value);
  }
  try {
    await webflow.enterComponent(inst);
  } catch {
    return;
  }
  try {
    const root = await (await inst.getComponent()).getRootElement();
    if (root != null) {
      await visit(root, merged, ctx.nestedDepth + 1);
    }
  } finally {
    await webflow.exitComponent().catch(() => undefined);
  }
}

async function considerDefinitionImageNode(ctx: DefinitionImageWalkContext, img: ImageElement): Promise<void> {
  if (ctx.mode === "first") {
    ctx.found.push(img);
    return;
  }
  if (
    await imageElementMatchesComponentImageProp(
      ctx.pageInstance,
      img,
      ctx.imagePropId,
      ctx.instanceImageProps,
      ctx.nestedAlias
    )
  ) {
    ctx.found.push(img);
  }
}

async function walkDefinitionChildren(ctx: DefinitionImageWalkContext, el: AnyElement): Promise<void> {
  for (const child of await readWebflowElementChildren(el)) {
    await walkDefinitionTreeForImages(child, ctx);
    if (shouldStopFirstModeWalk(ctx)) {
      return;
    }
  }
}

async function walkComponentInstanceInDefinition(
  ctx: DefinitionImageWalkContext,
  inst: ComponentElement
): Promise<void> {
  const slots = await inst.getSlots().catch(() => [] as SlotInstanceElement[]);
  for (const slot of slots) {
    for (const child of await readWebflowElementChildren(slot as unknown as AnyElement)) {
      await walkDefinitionTreeForImages(child, ctx);
      if (shouldStopFirstModeWalk(ctx)) {
        return;
      }
    }
  }
  if (shouldStopFirstModeWalk(ctx)) {
    return;
  }
  await enterNestedDefinitionIfImagePropLinked(inst, ctx, async (root, nestedAlias, nestedDepth) => {
    await walkDefinitionTreeForImages(root, { ...ctx, nestedAlias, nestedDepth });
  });
}

async function walkDefinitionTreeForImages(el: AnyElement, ctx: DefinitionImageWalkContext): Promise<void> {
  if (el.type === WEBFLOW_IMAGE_ELEMENT_TYPE) {
    await considerDefinitionImageNode(ctx, el as ImageElement);
    return;
  }
  if (el.type === "ComponentInstance") {
    await walkComponentInstanceInDefinition(ctx, el as ComponentElement);
    return;
  }
  await walkDefinitionChildren(ctx, el);
}

function createDefinitionImageWalkContext(
  pageInstance: ComponentElement,
  imagePropId: string,
  instanceImageProps: readonly ComponentInstanceImageProp[],
  mode: "match" | "first"
): DefinitionImageWalkContext {
  return {
    pageInstance,
    imagePropId,
    instanceImageProps,
    nestedAlias: new Map(),
    nestedDepth: 0,
    found: [],
    mode,
  };
}

async function collectMatchingImagesInDefinition(
  definitionRoot: AnyElement,
  pageInstance: ComponentElement,
  imagePropId: string,
  instanceImageProps: readonly ComponentInstanceImageProp[]
): Promise<ImageElement[]> {
  const ctx = createDefinitionImageWalkContext(pageInstance, imagePropId, instanceImageProps, "match");
  await walkDefinitionTreeForImages(definitionRoot, ctx);
  return ctx.found;
}

async function findFirstImageInDefinition(
  definitionRoot: AnyElement,
  pageInstance: ComponentElement,
  imagePropId: string,
  instanceImageProps: readonly ComponentInstanceImageProp[]
): Promise<ImageElement | null> {
  const ctx = createDefinitionImageWalkContext(pageInstance, imagePropId, instanceImageProps, "first");
  await walkDefinitionTreeForImages(definitionRoot, ctx);
  return ctx.found[0] ?? null;
}

async function findSingleImagePropFallback(
  instanceImageProps: readonly ComponentInstanceImageProp[],
  startNodes: readonly AnyElement[],
  definitionRoot?: AnyElement | null,
  pageInstance?: ComponentElement,
  imagePropId?: string
): Promise<ImageElement | null> {
  if (instanceImageProps.length !== 1) {
    return null;
  }
  if (definitionRoot != null && pageInstance != null && imagePropId != null) {
    return findFirstImageInDefinition(definitionRoot, pageInstance, imagePropId, instanceImageProps);
  }
  return findFirstImageDescendantBfs(startNodes);
}

async function findFromDefinitionRoot(
  instance: ComponentElement,
  imagePropId: string,
  definitionRoot: AnyElement,
  instanceImageProps: readonly ComponentInstanceImageProp[]
): Promise<ImageElement | null> {
  const matched = await collectMatchingImagesInDefinition(definitionRoot, instance, imagePropId, instanceImageProps);
  if (matched.length > 0) {
    return matched[0] ?? null;
  }
  return findSingleImagePropFallback(instanceImageProps, [definitionRoot], definitionRoot, instance, imagePropId);
}

/**
 * The canvas `Image` for export/style inference (instance nodes have no `getStyles`).
 */
export async function findImageElementForComponentInstanceProp(
  instance: ComponentElement,
  imagePropId: string,
  options?: FindComponentInstanceImageOptions
): Promise<ImageElement | null> {
  return runExclusiveDesignerOp(async () => {
    const instanceImageProps = options?.instanceImageProps ?? (await searchComponentInstanceImageProps(instance));
    const definitionRoot = options?.definitionRoot ?? null;

    if (definitionRoot != null) {
      const fromDefinition = await findFromDefinitionRoot(instance, imagePropId, definitionRoot, instanceImageProps);
      if (fromDefinition != null) {
        return fromDefinition;
      }
    }

    const underInstance = await collectMatchingImagesBfs([instance], instance, imagePropId, instanceImageProps);
    if (underInstance.length > 0) {
      return underInstance[0] ?? null;
    }

    return findSingleImagePropFallback(instanceImageProps, [instance], definitionRoot, instance, imagePropId);
  });
}
