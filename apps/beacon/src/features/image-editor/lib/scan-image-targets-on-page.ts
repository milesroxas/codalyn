import { WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import {
  computeImagePageStructureKey,
  type ImagePageTargetCacheRecord,
  imagePageTargetsToCacheRecords,
  readComponentInstanceDisplayName,
  readImagePageTargetScanCache,
  readInflightImagePageTargetScan,
  readPageScanCacheEntry,
  rebindImagePageTargetsFromCache,
  resolveImagePageTargetScanPageId,
  searchComponentInstanceImagePropsForPageScan,
  trackInflightImagePageTargetScan,
  writeImagePageTargetScanCache,
} from "@/features/image-editor/lib/image-page-target-scan-cache";
import { collectWebflowStructureNodesInCanvasOrder } from "@/features/image-editor/lib/webflow-element-structure-walk";

export type ImagePageTarget = {
  id: string;
  kind: "image" | "component";
  element: AnyElement;
  label: string;
  /** When kind is "component" — the prop Beacon will set on export. */
  imagePropId?: string;
  imagePropLabel?: string;
};

const MAX_TARGETS = 200;

export type ImagePageTargetScanProgress = {
  phase: "collecting" | "scanning";
  scannedElements: number;
  totalElements: number;
  foundTargets: number;
};

export type ScanImageTargetsOnPageResult = {
  targets: ImagePageTarget[];
  cacheHit: boolean;
};

export type ScanImageTargetsOnPageOptions = {
  onProgress?: (progress: ImagePageTargetScanProgress) => void;
  /** Bypass cached scan results (explicit re-scan). Collection still runs to validate page structure. */
  forceRefresh?: boolean;
  pageId?: string | null;
};

function shouldReportImageTargetScanProgress(scanned: number, total: number, lastReported: number): boolean {
  if (scanned === 0 || scanned === total) {
    return true;
  }
  if (total <= 40) {
    return true;
  }
  const step = Math.max(1, Math.floor(total / 40));
  return scanned - lastReported >= step;
}

function shouldReportImageTargetCollectionProgress(discovered: number, lastReported: number): boolean {
  if (discovered <= 1) {
    return true;
  }
  const step = Math.max(1, Math.floor(discovered / 40));
  return discovered - lastReported >= step;
}

function shortId(n: number, prefix: string): string {
  return `${prefix}-${n}`;
}

async function makeImageLabel(_el: ImageElement): Promise<string> {
  return "Image";
}

function imagePropLabelFrom(p: InstanceProp): string {
  const l = p.display?.label;
  return l && l.length > 0 ? l : "Image field";
}

async function tryPushScannedImageTarget(el: AnyElement, out: ImagePageTarget[]): Promise<void> {
  if (el.type === WEBFLOW_IMAGE_ELEMENT_TYPE) {
    const label = await makeImageLabel(el as ImageElement);
    out.push({
      id: shortId(out.length, "image"),
      kind: "image",
      element: el,
      label,
    });
    return;
  }
  if (el.type === "ComponentInstance") {
    const inst = el as ComponentElement;
    const props = await searchComponentInstanceImagePropsForPageScan(inst);
    if (props.length === 0) {
      return;
    }
    const cname = await readComponentInstanceDisplayName(inst);
    const p0 = props[0];
    if (!p0) {
      return;
    }
    out.push({
      id: shortId(out.length, "comp"),
      kind: "component",
      element: el,
      label: cname,
      imagePropId: p0.propId,
      imagePropLabel: imagePropLabelFrom(p0),
    });
  }
}

/**
 * Every canvas node we should consider for image targets, including **nested** component
 * instances and **slot** content — in **canvas / DOM order** (see
 * {@link collectWebflowStructureNodesInCanvasOrder}).
 */
export async function collectAllPageElementsForImageScan(options?: {
  onDiscovered?: (count: number) => void;
  allElements?: AnyElement[];
}): Promise<AnyElement[]> {
  return collectWebflowStructureNodesInCanvasOrder(options);
}

async function collectPageElementsForScan(
  report: ScanImageTargetsOnPageOptions["onProgress"] | undefined,
  options?: { silent?: boolean }
): Promise<AnyElement[]> {
  const silent = options?.silent === true;
  let lastCollectionReport = 0;
  if (!silent) {
    report?.({
      phase: "collecting",
      scannedElements: 0,
      totalElements: 0,
      foundTargets: 0,
    });
  }

  const allElements = await webflow.getAllElements();
  return collectAllPageElementsForImageScan({
    allElements,
    onDiscovered: (discovered) => {
      if (silent || !shouldReportImageTargetCollectionProgress(discovered, lastCollectionReport)) {
        return;
      }
      lastCollectionReport = discovered;
      report?.({
        phase: "collecting",
        scannedElements: discovered,
        totalElements: 0,
        foundTargets: 0,
      });
    },
  });
}

async function scanCollectedPageElements(
  all: AnyElement[],
  report: ScanImageTargetsOnPageOptions["onProgress"]
): Promise<ImagePageTarget[]> {
  const out: ImagePageTarget[] = [];
  const totalElements = all.length;
  let lastReported = -1;

  report?.({
    phase: "scanning",
    scannedElements: 0,
    totalElements,
    foundTargets: 0,
  });

  for (let index = 0; index < all.length; index += 1) {
    if (out.length >= MAX_TARGETS) {
      if (shouldReportImageTargetScanProgress(totalElements, totalElements, lastReported)) {
        report?.({
          phase: "scanning",
          scannedElements: totalElements,
          totalElements,
          foundTargets: out.length,
        });
      }
      break;
    }

    const el = all[index];
    if (el) {
      await tryPushScannedImageTarget(el, out);
    }

    const scannedElements = index + 1;
    if (shouldReportImageTargetScanProgress(scannedElements, totalElements, lastReported)) {
      lastReported = scannedElements;
      report?.({
        phase: "scanning",
        scannedElements,
        totalElements,
        foundTargets: out.length,
      });
    }
  }

  return out;
}

function tryFastRebindFromPageElements(
  records: readonly ImagePageTargetCacheRecord[],
  allElements: AnyElement[]
): ImagePageTarget[] | null {
  const rebound = rebindImagePageTargetsFromCache(records, allElements);
  if (rebound.length !== records.length) {
    return null;
  }
  return rebound;
}

async function runImagePageTargetScan(options?: ScanImageTargetsOnPageOptions): Promise<ScanImageTargetsOnPageResult> {
  const report = options?.onProgress;
  const pageId = await resolveImagePageTargetScanPageId(options?.pageId);
  if (pageId == null) {
    return { targets: [], cacheHit: false };
  }

  const mayUseCache = options?.forceRefresh !== true;
  if (mayUseCache) {
    const cachedEntry = readPageScanCacheEntry(pageId);
    if (cachedEntry != null) {
      const allElements = await webflow.getAllElements();
      const fastRebound = tryFastRebindFromPageElements(cachedEntry.records, allElements);
      if (fastRebound != null) {
        return { targets: fastRebound, cacheHit: true };
      }
    }
  }

  const all = await collectPageElementsForScan(report);
  const structureKey = computeImagePageStructureKey(all);

  if (mayUseCache) {
    const cachedRecords = readImagePageTargetScanCache(pageId, structureKey);
    if (cachedRecords != null) {
      const rebound = rebindImagePageTargetsFromCache(cachedRecords, all);
      return { targets: rebound, cacheHit: true };
    }
  }

  const targets = await scanCollectedPageElements(all, report);
  writeImagePageTargetScanCache(pageId, structureKey, imagePageTargetsToCacheRecords(targets));
  return { targets, cacheHit: false };
}

/**
 * Restores cached scan results when the page structure is unchanged — no scanning phase.
 * Returns null when there is no cache or the page structure changed.
 */
export async function tryRestoreCachedImagePageTargets(
  pageId: string,
  onProgress?: ScanImageTargetsOnPageOptions["onProgress"]
): Promise<ImagePageTarget[] | null> {
  const resolvedPageId = await resolveImagePageTargetScanPageId(pageId);
  if (resolvedPageId == null) {
    return null;
  }

  const cachedEntry = readPageScanCacheEntry(resolvedPageId);
  if (cachedEntry == null) {
    return null;
  }

  const allElements = await webflow.getAllElements();
  const fastRebound = tryFastRebindFromPageElements(cachedEntry.records, allElements);
  if (fastRebound != null) {
    return fastRebound;
  }

  const all = await collectPageElementsForScan(onProgress);
  const structureKey = computeImagePageStructureKey(all);
  const cachedRecords = readImagePageTargetScanCache(resolvedPageId, structureKey);
  if (cachedRecords == null) {
    return null;
  }

  return rebindImagePageTargetsFromCache(cachedRecords, all);
}

/**
 * Lists Image elements and component instances with at least one image-capable prop
 * (`imageAsset`, `cmsImage`, `image`, `imageSet`) on the current page.
 *
 * Merges {@link webflow.getAllElements} with each instance’s public children and **slot**
 * children so image-capable components inside slots or other instances are not skipped.
 *
 * Scan results are cached per page until the page structure changes. Pass
 * {@link ScanImageTargetsOnPageOptions.forceRefresh} for an explicit re-scan.
 */
export async function scanImageTargetsOnPage(
  options?: ScanImageTargetsOnPageOptions
): Promise<ScanImageTargetsOnPageResult> {
  const pageId = await resolveImagePageTargetScanPageId(options?.pageId);
  if (pageId == null) {
    return { targets: [], cacheHit: false };
  }

  if (!options?.forceRefresh) {
    const inflight = readInflightImagePageTargetScan(pageId);
    if (inflight != null) {
      return inflight;
    }
  }

  return trackInflightImagePageTargetScan(pageId, runImagePageTargetScan(options));
}

export type SelectedImageTargetHint =
  | { kind: "none" }
  | { kind: "image"; target: ImagePageTarget }
  | { kind: "component"; target: ImagePageTarget; propCount: number };

/**
 * If the current canvas selection is an image-capable target, returns a hint
 * (best-effort: compare element references by identity after rescan, or
 * for robustness, match type + re-scan; here we only check selected element
 * in isolation to avoid a full rescan on every call).
 */
function hintForListMatch(t: ImagePageTarget): SelectedImageTargetHint {
  if (t.kind === "image") {
    return { kind: "image", target: t };
  }
  return {
    kind: "component",
    target: t,
    propCount: 1,
  };
}

async function hintForSelectedOutsideList(sel: AnyElement): Promise<SelectedImageTargetHint> {
  if (sel.type === WEBFLOW_IMAGE_ELEMENT_TYPE) {
    const label = await makeImageLabel(sel as ImageElement);
    return {
      kind: "image",
      target: {
        id: "selected-image",
        kind: "image",
        element: sel,
        label,
      },
    };
  }
  if (sel.type !== "ComponentInstance") {
    return { kind: "none" };
  }
  const inst = sel as ComponentElement;
  const props = await searchComponentInstanceImagePropsForPageScan(inst);
  if (props.length === 0) {
    return { kind: "none" };
  }
  const cname = await readComponentInstanceDisplayName(inst);
  const p0 = props[0];
  if (!p0) {
    return { kind: "none" };
  }
  return {
    kind: "component",
    target: {
      id: "selected-comp",
      kind: "component",
      element: sel,
      label: cname,
      imagePropId: p0.propId,
      imagePropLabel: imagePropLabelFrom(p0),
    },
    propCount: props.length,
  };
}

export async function getSelectedImageTargetHint(allTargets: ImagePageTarget[]): Promise<SelectedImageTargetHint> {
  const sel = await webflow.getSelectedElement();
  if (sel == null) {
    return { kind: "none" };
  }
  for (const t of allTargets) {
    if (t.element === sel) {
      return hintForListMatch(t);
    }
  }
  return await hintForSelectedOutsideList(sel);
}
