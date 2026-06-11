import { searchComponentInstanceImageProps } from "@/features/image-editor/lib/search-component-instance-image-props";
import { webflowElementIdKey, webflowTreeNodeKey } from "@/features/image-editor/lib/webflow-element-id-key";
import { readCurrentPageIdOrNull } from "@/shared/lib/webflow-page-canvas-context";

type ReboundImagePageTarget = {
  id: string;
  kind: "image" | "component";
  element: AnyElement;
  label: string;
  imagePropId?: string;
  imagePropLabel?: string;
};

export type ImagePageTargetScanResult = {
  targets: ReboundImagePageTarget[];
  cacheHit: boolean;
};

type ImagePageTargetLike = {
  kind: "image" | "component";
  element: AnyElement;
  label: string;
  imagePropId?: string;
  imagePropLabel?: string;
};

export type ImagePageTargetCacheRecord =
  | {
      kind: "image";
      elementKey: string;
      label: string;
    }
  | {
      kind: "component";
      elementKey: string;
      label: string;
      imagePropId: string;
      imagePropLabel: string;
    };

type PageScanCacheEntry = {
  structureKey: string;
  records: ImagePageTargetCacheRecord[];
};

const pageScanCacheByPageId = new Map<string, PageScanCacheEntry>();
let inflightScanByPageId = new Map<string, Promise<ImagePageTargetScanResult>>();
let componentImagePropsCache = new Map<string, Awaited<ReturnType<typeof searchComponentInstanceImageProps>>>();
let componentDefinitionNameCache = new Map<string, string>();
let subscribedToPageChanges = false;

function clearInflightImagePageTargetScans() {
  inflightScanByPageId = new Map();
}

function ensurePageChangeInvalidation() {
  if (subscribedToPageChanges) {
    return;
  }
  if (typeof webflow === "undefined" || typeof webflow.subscribe !== "function") {
    return;
  }
  subscribedToPageChanges = true;
  webflow.subscribe("currentpage", () => {
    clearInflightImagePageTargetScans();
  });
}

/** Ordered element keys for the collected page tree — cache hits require an exact match after re-collection. */
export function computeImagePageStructureKey(elements: readonly AnyElement[]): string {
  if (elements.length === 0) {
    return "";
  }
  return elements
    .map((element) => webflowTreeNodeKey(element))
    .sort()
    .join("\0");
}

export function imagePageTargetsToCacheRecords(targets: readonly ImagePageTargetLike[]): ImagePageTargetCacheRecord[] {
  return targets.map((target) => {
    const elementKey = webflowTreeNodeKey(target.element);
    if (target.kind === "image") {
      return {
        kind: "image",
        elementKey,
        label: target.label,
      };
    }
    return {
      kind: "component",
      elementKey,
      label: target.label,
      imagePropId: target.imagePropId ?? "",
      imagePropLabel: target.imagePropLabel ?? "Image field",
    };
  });
}

function shortId(index: number, prefix: string): string {
  return `${prefix}-${index}`;
}

export function rebindImagePageTargetsFromCache(
  records: readonly ImagePageTargetCacheRecord[],
  elements: readonly AnyElement[]
): ReboundImagePageTarget[] {
  const elementsByKey = new Map(elements.map((element) => [webflowTreeNodeKey(element), element]));
  const out: ReboundImagePageTarget[] = [];

  for (const record of records) {
    const element = elementsByKey.get(record.elementKey);
    if (element == null) {
      continue;
    }
    if (record.kind === "image") {
      out.push({
        id: shortId(out.length, "image"),
        kind: "image",
        element,
        label: record.label,
      });
      continue;
    }
    out.push({
      id: shortId(out.length, "comp"),
      kind: "component",
      element,
      label: record.label,
      imagePropId: record.imagePropId,
      imagePropLabel: record.imagePropLabel,
    });
  }

  return out;
}

export function readPageScanCacheEntry(pageId: string): PageScanCacheEntry | null {
  ensurePageChangeInvalidation();
  return pageScanCacheByPageId.get(pageId) ?? null;
}

export function hasImagePageTargetScanCache(pageId: string): boolean {
  return readPageScanCacheEntry(pageId) != null;
}

export function readImagePageTargetScanCache(
  pageId: string,
  structureKey: string
): ImagePageTargetCacheRecord[] | null {
  ensurePageChangeInvalidation();
  const entry = pageScanCacheByPageId.get(pageId);
  if (entry == null || entry.structureKey !== structureKey) {
    return null;
  }
  return entry.records;
}

export function writeImagePageTargetScanCache(
  pageId: string,
  structureKey: string,
  records: readonly ImagePageTargetCacheRecord[]
): void {
  ensurePageChangeInvalidation();
  pageScanCacheByPageId.set(pageId, {
    structureKey,
    records: [...records],
  });
}

export function invalidateImagePageTargetScanCache(): void {
  pageScanCacheByPageId.clear();
  clearInflightImagePageTargetScans();
  componentImagePropsCache = new Map();
  componentDefinitionNameCache = new Map();
}

export async function resolveImagePageTargetScanPageId(pageId: string | null | undefined): Promise<string | null> {
  if (typeof pageId === "string" && pageId.length > 0) {
    return pageId;
  }
  return readCurrentPageIdOrNull();
}

export async function searchComponentInstanceImagePropsForPageScan(
  instance: ComponentElement
): Promise<Awaited<ReturnType<typeof searchComponentInstanceImageProps>>> {
  ensurePageChangeInvalidation();
  const cacheKey = webflowElementIdKey(instance);
  const cached = componentImagePropsCache.get(cacheKey);
  if (cached != null) {
    return cached;
  }
  const props = await searchComponentInstanceImageProps(instance);
  componentImagePropsCache.set(cacheKey, props);
  return props;
}

export async function readComponentInstanceDisplayName(instance: ComponentElement): Promise<string> {
  ensurePageChangeInvalidation();
  const definitionId = instance.id.component;
  if (typeof definitionId === "string" && definitionId.length > 0) {
    const cached = componentDefinitionNameCache.get(definitionId);
    if (cached != null) {
      return cached;
    }
  }
  const component = await instance.getComponent();
  const name = (await component.getName()) || "Component";
  if (typeof definitionId === "string" && definitionId.length > 0) {
    componentDefinitionNameCache.set(definitionId, name);
  }
  return name;
}

export function readInflightImagePageTargetScan(pageId: string): Promise<ImagePageTargetScanResult> | null {
  return inflightScanByPageId.get(pageId) ?? null;
}

export function trackInflightImagePageTargetScan(
  pageId: string,
  scan: Promise<ImagePageTargetScanResult>
): Promise<ImagePageTargetScanResult> {
  ensurePageChangeInvalidation();
  inflightScanByPageId.set(pageId, scan);
  return scan.finally(() => {
    if (inflightScanByPageId.get(pageId) === scan) {
      inflightScanByPageId.delete(pageId);
    }
  });
}
