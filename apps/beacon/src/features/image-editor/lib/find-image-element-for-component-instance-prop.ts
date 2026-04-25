import { WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import { asCmsBinding, type CmsImageBindingRef } from "@/features/image-editor/lib/element-cms-image-binding";
import { searchComponentInstanceImageProps } from "@/features/image-editor/lib/search-component-instance-image-props";
import { webflowElementIdKey } from "@/features/image-editor/lib/webflow-element-id-key";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

const IMAGE_SETTING_VALUE_TYPES = new Set(["image", "imageAsset", "cmsImage", "imageSet"]);

function elementSettingBindsToPropId(setting: unknown, propId: string): boolean {
  if (!isRecord(setting)) {
    return false;
  }
  const v = setting.value;
  if (!isRecord(v)) {
    return false;
  }
  return v.sourceType === "prop" && v.propId === propId;
}

type SearchSettingsImage = {
  searchSettings: (o?: { valueType?: string }) => Promise<Record<string, unknown>>;
};

/**
 * CMS-bound image fields use `sourceType: "cms"` on the image and on the instance prop, not
 * `sourceType: "prop"`. Match collection + field.
 */
function cmsRefFromElementSetting(setting: unknown): CmsImageBindingRef | null {
  if (!isRecord(setting) || !IMAGE_SETTING_VALUE_TYPES.has(String(setting.valueType))) {
    return null;
  }
  return asCmsBinding(setting.value);
}

async function imageSettingsHaveCmsMatch(img: ImageElement, target: CmsImageBindingRef): Promise<boolean> {
  const w = img as ImageElement & Partial<SearchSettingsImage>;
  if (typeof w.searchSettings !== "function") {
    return false;
  }
  for (const vt of ["image", "imageAsset", "cmsImage", "imageSet"] as const) {
    const settings = await w.searchSettings({ valueType: vt }).catch(() => ({}) as Record<string, unknown>);
    for (const s of Object.values(settings)) {
      const r = cmsRefFromElementSetting(s);
      if (r && r.collectionId === target.collectionId && r.fieldId === target.fieldId) {
        return true;
      }
    }
  }
  const all = await w.searchSettings().catch(() => ({}) as Record<string, unknown>);
  for (const s of Object.values(all)) {
    const r = cmsRefFromElementSetting(s);
    if (r && r.collectionId === target.collectionId && r.fieldId === target.fieldId) {
      return true;
    }
  }
  return false;
}

const IMAGE_VALUE_TYPES = ["image", "imageAsset", "cmsImage", "imageSet"] as const;

type SearchSettingsEl = {
  searchSettings: (o?: { valueType?: (typeof IMAGE_VALUE_TYPES)[number] | string }) => Promise<Record<string, unknown>>;
};

/**
 * `true` when the image’s settings bind the main image field to the given component prop
 * ( Designer “prop” binding or equivalent CMS field binding ).
 */
export async function imageElementBindsToComponentProp(img: ImageElement, propId: string): Promise<boolean> {
  const withSearch = img as ImageElement & Partial<SearchSettingsEl>;
  if (typeof withSearch.searchSettings !== "function") {
    return false;
  }
  for (const vt of IMAGE_VALUE_TYPES) {
    const settings = await withSearch.searchSettings({ valueType: vt }).catch(() => ({}) as Record<string, unknown>);
    for (const s of Object.values(settings)) {
      if (elementSettingBindsToPropId(s, propId)) {
        return true;
      }
    }
  }
  const all = await withSearch.searchSettings().catch(() => ({}) as Record<string, unknown>);
  for (const s of Object.values(all)) {
    if (elementSettingBindsToPropId(s, propId)) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves the canvas image for a component image prop: **prop** bindings, **CMS** bindings
 * (collection + field), or the legacy per-prop scan.
 */
export async function imageElementMatchesComponentImageProp(
  instance: ComponentElement,
  img: ImageElement,
  propId: string
): Promise<boolean> {
  const props = await searchComponentInstanceImageProps(instance);
  const prop = props.find((p) => p.propId === propId) ?? props[0];
  if (prop == null) {
    return false;
  }
  const propCms = asCmsBinding(prop.value);
  if (propCms) {
    return imageSettingsHaveCmsMatch(img, propCms);
  }
  return imageElementBindsToComponentProp(img, prop.propId);
}

async function getChildList(
  node: { getChildren?: () => Promise<AnyElement[] | null> } | null | undefined
): Promise<AnyElement[]> {
  if (node == null || typeof node.getChildren !== "function") {
    return [];
  }
  const ch = await node.getChildren();
  return ch == null ? [] : ch;
}

async function considerImageForProp(
  instance: ComponentElement,
  n: AnyElement,
  imagePropId: string,
  found: ImageElement[]
): Promise<void> {
  if (n.type !== WEBFLOW_IMAGE_ELEMENT_TYPE) {
    return;
  }
  const img = n as ImageElement;
  if (await imageElementMatchesComponentImageProp(instance, img, imagePropId)) {
    found.push(img);
  }
}

async function appendStructureChildrenToQueue(n: AnyElement, queue: AnyElement[]): Promise<void> {
  for (const c of await getChildList(n as { getChildren?: () => Promise<AnyElement[] | null> })) {
    queue.push(c);
  }
  if (n.type !== "ComponentInstance") {
    return;
  }
  const inst = n as ComponentElement;
  const slots = await inst.getSlots().catch(() => [] as Awaited<ReturnType<ComponentElement["getSlots"]>>);
  for (const s of slots) {
    for (const c of await getChildList(s as unknown as { getChildren?: () => Promise<AnyElement[] | null> })) {
      queue.push(c);
    }
  }
}

/**
 * BFS from the instance: optional `getChildren` on instances + slot contents
 * (component root images usually live there; typings omit `getChildren` on instances).
 */
async function findImageCandidatesUnderInstanceBfs(
  instance: ComponentElement,
  imagePropId: string
): Promise<ImageElement[]> {
  const found: ImageElement[] = [];
  const seen = new Set<string>();
  const queue: AnyElement[] = [instance];
  while (queue.length) {
    const n = queue.shift() as AnyElement;
    const k = webflowElementIdKey(n);
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    await considerImageForProp(instance, n, imagePropId, found);
    await appendStructureChildrenToQueue(n, queue);
  }
  return found;
}

/**
 * First `Image` under the instance (BFS) when prop/CMS matching is inconclusive; only for
 * **single** image prop components to avoid wrong picks.
 */
async function findFirstImageDescendantBfs(instance: ComponentElement): Promise<ImageElement | null> {
  const seen = new Set<string>();
  const queue: AnyElement[] = [instance];
  while (queue.length) {
    const n = queue.shift() as AnyElement;
    const k = webflowElementIdKey(n);
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    if (n.type === WEBFLOW_IMAGE_ELEMENT_TYPE) {
      return n as ImageElement;
    }
    await appendStructureChildrenToQueue(n, queue);
  }
  return null;
}

/**
 * The canvas `Image` for export/style inference (instance nodes have no `getStyles`).
 */
export async function findImageElementForComponentInstanceProp(
  instance: ComponentElement,
  imagePropId: string
): Promise<ImageElement | null> {
  const under = await findImageCandidatesUnderInstanceBfs(instance, imagePropId);
  if (under.length > 0) {
    return under[0] ?? null;
  }
  const all = await webflow.getAllElements();
  const onPage: ImageElement[] = [];
  for (const e of all) {
    if (e.type !== WEBFLOW_IMAGE_ELEMENT_TYPE) {
      continue;
    }
    const img = e as ImageElement;
    if (await imageElementMatchesComponentImageProp(instance, img, imagePropId)) {
      onPage.push(img);
    }
  }
  if (onPage.length === 1) {
    return onPage[0] ?? null;
  }

  const props = await searchComponentInstanceImageProps(instance);
  if (props.length === 1) {
    const any = await findFirstImageDescendantBfs(instance);
    if (any) {
      return any;
    }
  }
  return null;
}
