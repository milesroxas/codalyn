import { WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import { searchComponentInstanceImageProps } from "@/features/image-editor/lib/search-component-instance-image-props";
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

export type ScanImageTargetsOnPageOptions = {
  onProgress?: (progress: ImagePageTargetScanProgress) => void;
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
    const props = await searchComponentInstanceImageProps(inst);
    if (props.length === 0) {
      return;
    }
    const comp = await inst.getComponent();
    const cname = (await comp.getName()) || "Component";
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
}): Promise<AnyElement[]> {
  return collectWebflowStructureNodesInCanvasOrder(options);
}

/**
 * Lists Image elements and component instances with at least one image-capable prop
 * (`imageAsset`, `cmsImage`, `image`, `imageSet`) on the current page.
 *
 * Merges {@link webflow.getAllElements} with each instance’s public children and **slot**
 * children so image-capable components inside slots or other instances are not skipped.
 */
export async function scanImageTargetsOnPage(options?: ScanImageTargetsOnPageOptions): Promise<ImagePageTarget[]> {
  const report = options?.onProgress;
  let lastCollectionReport = 0;
  report?.({
    phase: "collecting",
    scannedElements: 0,
    totalElements: 0,
    foundTargets: 0,
  });

  const all = await collectAllPageElementsForImageScan({
    onDiscovered: (discovered) => {
      if (!shouldReportImageTargetCollectionProgress(discovered, lastCollectionReport)) {
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
  const props = await searchComponentInstanceImageProps(inst);
  if (props.length === 0) {
    return { kind: "none" };
  }
  const comp = await inst.getComponent();
  const cname = (await comp.getName()) || "Component";
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
