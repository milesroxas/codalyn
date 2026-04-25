import { WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import {
  buildDesignerTaggedExportDimensions,
  readBeaconDesignerExportDimensionsFromImage,
} from "@/features/image-editor/lib/beacon-designer-image-export-attrs";
import {
  type AssetDimensions,
  computeExportDimensionsFromAspectChain,
  type ExportDimensions,
} from "@/features/image-editor/lib/infer-export-dimensions-compute";
import {
  type ElementStyleMerge,
  mergeWebflowElementStyleProperties,
} from "@/features/image-editor/lib/merge-webflow-element-style-properties";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import {
  buildWebflowParentByChildIdMap,
  getLayoutAncestorsForStyleRead,
  type WebflowLayoutParent,
} from "@/features/image-editor/lib/webflow-page-parent-map";
import { withImageElementForPageTarget } from "@/features/image-editor/lib/with-image-element-for-page-target";

const LOG_PREFIX = "[Beacon export infer]";

/**
 * Only the nearest handful of ancestors practically carry an authored `aspect-ratio`
 * (image wrapper, card, sometimes one more). Walking deeper adds Designer API cost
 * without yielding usable signals on real sites.
 */
const ANCESTOR_STYLE_DEPTH = 3;

type ParentWithStyle = { element: AnyElement; merge: ElementStyleMerge };

type ImageReadResult = {
  image: ImageElement | null;
  asset: AssetDimensions;
  imageMerge: ElementStyleMerge | null;
  parents: ParentWithStyle[];
  enteredComponent: boolean;
};

function assetFromWebflowGetAsset(a: { width?: number; height?: number } | null): AssetDimensions {
  const d = a;
  if (d == null || d.width == null || d.height == null || d.width <= 0 || d.height <= 0) {
    return {};
  }
  return { w: d.width, h: d.height };
}

async function readParentChainForImage(image: AnyElement): Promise<ParentWithStyle[]> {
  const parentMap = (await buildWebflowParentByChildIdMap()) ?? new Map<string, WebflowLayoutParent>();
  const ancestors = await getLayoutAncestorsForStyleRead(image, ANCESTOR_STYLE_DEPTH, parentMap);
  const merges = await Promise.all(ancestors.map((el) => mergeWebflowElementStyleProperties(el)));
  return ancestors.map((element, i) => ({ element, merge: merges[i] as ElementStyleMerge }));
}

async function mergeImageStyles(image: AnyElement): Promise<ElementStyleMerge | null> {
  if (image.type !== WEBFLOW_IMAGE_ELEMENT_TYPE) {
    return null;
  }
  return mergeWebflowElementStyleProperties(image);
}

async function readImageWithAncestors(image: ImageElement | null, enteredComponent: boolean): Promise<ImageReadResult> {
  if (image == null) {
    return { image: null, asset: {}, imageMerge: null, parents: [], enteredComponent };
  }
  const a = await image.getAsset().catch(() => null);
  const asset = assetFromWebflowGetAsset(a as { width?: number; height?: number } | null);
  const imageMerge = await mergeImageStyles(image).catch(() => null);
  const parents = await readParentChainForImage(image).catch(() => [] as ParentWithStyle[]);
  return { image, asset, imageMerge, parents, enteredComponent };
}

/**
 * Reads the image, asset, styles, and ancestor chain for a direct `Image` canvas target
 * (or, for a component, the bound image; enters component for read so styles resolve).
 */
async function readForImageTarget(t: ImagePageTarget & { kind: "image" }): Promise<ImageReadResult> {
  return withImageElementForPageTarget<ImageReadResult>(t, (img) => readImageWithAncestors(img, false));
}

/**
 * For `ComponentInstance` targets, the component canvas is entered so `getStyles()` matches
 * the authored image and wrappers; always exits in `finally`.
 */
async function readForComponentTarget(t: ImagePageTarget & { kind: "component" }): Promise<ImageReadResult> {
  return withImageElementForPageTarget<ImageReadResult>(t, (img) => readImageWithAncestors(img, true), {
    onComponentEnterFailed: () => ({
      image: null,
      asset: {},
      imageMerge: null,
      parents: [],
      enteredComponent: false,
    }),
  });
}

async function readForTarget(t: ImagePageTarget): Promise<ImageReadResult> {
  if (t.kind === "image") {
    return readForImageTarget(t as ImagePageTarget & { kind: "image" });
  }
  if (t.kind === "component") {
    return readForComponentTarget(t as ImagePageTarget & { kind: "component" });
  }
  return { image: null, asset: {}, imageMerge: null, parents: [], enteredComponent: false };
}

function firstParentLabel(parent: ParentWithStyle): string | undefined {
  const classes = parent.merge.classNames;
  if (classes.length > 0) {
    return `.${classes[0]}`;
  }
  const t = (parent.element as { type?: string }).type;
  return typeof t === "string" && t.length > 0 ? t : undefined;
}

function logDiagnostics(entry: {
  target: { kind: string; label: string; imagePropId?: string };
  fileAsset: AssetDimensions;
  enteredComponent: boolean;
  image: { merge: ElementStyleMerge | null; type: string | null };
  parents: ParentWithStyle[];
  result: ExportDimensions;
}) {
  const aspect = entry.result.width > 0 && entry.result.height > 0 ? entry.result.width / entry.result.height : 0;
  // eslint-disable-next-line no-console -- dev diagnostics for aspect-ratio inference (Phase 0)
  console.groupCollapsed(
    `${LOG_PREFIX} ${entry.target.kind}:${entry.target.label} → ${entry.result.width}×${entry.result.height} (${entry.result.note})`
  );
  // eslint-disable-next-line no-console
  console.log("target", entry.target);
  // eslint-disable-next-line no-console
  console.log("context", { enteredComponent: entry.enteredComponent });
  // eslint-disable-next-line no-console
  console.log("fileAsset", entry.fileAsset);
  // eslint-disable-next-line no-console
  console.log("image", {
    elementType: entry.image.type,
    classNames: entry.image.merge?.classNames ?? [],
    rawLayoutProps: entry.image.merge?.rawLayoutProps ?? {},
    aspectRatio: entry.image.merge?.aspectRatio,
  });
  // eslint-disable-next-line no-console
  console.log(
    "parents",
    entry.parents.map((p, i) => ({
      index: i + 1,
      elementType: (p.element as { type?: string }).type,
      classNames: p.merge.classNames,
      rawLayoutProps: p.merge.rawLayoutProps,
      aspectRatio: p.merge.aspectRatio,
    }))
  );
  // eslint-disable-next-line no-console
  console.log("decision", {
    inferenceSource: entry.result.inferenceSource,
    aspect: entry.result.aspect,
    aspectSource: entry.result.aspectSource,
    longEdge: entry.result.longEdge,
    longEdgeSource: entry.result.longEdgeSource,
  });
  // eslint-disable-next-line no-console
  console.log("result", {
    width: entry.result.width,
    height: entry.result.height,
    aspectComputed: Number.isFinite(aspect) ? Number(aspect.toFixed(6)) : aspect,
    note: entry.result.note,
  });
  // eslint-disable-next-line no-console
  console.groupEnd();
}

/**
 * Infers export `{ width, height, note }` for a canvas `Image` (or the component's bound
 * image) from `aspect-ratio` authored on the image or its nearest ancestors, falling back
 * to the file's intrinsic ratio and the file's long edge. For `ComponentInstance` targets,
 * the component editing canvas is entered so wrapper styles can be read. Phase 0
 * diagnostics are logged to the console so we can see what Webflow actually returns per
 * ancestor.
 */
export async function inferExportDimensionsForTarget(t: ImagePageTarget): Promise<ExportDimensions> {
  const targetMeta = { kind: t.kind, label: t.label, imagePropId: t.imagePropId };
  const read = await readForTarget(t);
  if (read.image != null) {
    const tagged = await readBeaconDesignerExportDimensionsFromImage(read.image);
    if (tagged != null) {
      const result = buildDesignerTaggedExportDimensions(tagged.width, tagged.height);
      logDiagnostics({
        target: targetMeta,
        fileAsset: read.asset,
        enteredComponent: read.enteredComponent,
        image: { merge: read.imageMerge, type: read.image?.type ?? null },
        parents: read.parents,
        result,
      });
      return result;
    }
  }
  const parentAspects = read.parents.map((p) => ({
    aspect: p.merge.aspectRatio,
    label: firstParentLabel(p),
  }));
  const result = computeExportDimensionsFromAspectChain(read.imageMerge?.aspectRatio, parentAspects, read.asset);
  logDiagnostics({
    target: targetMeta,
    fileAsset: read.asset,
    enteredComponent: read.enteredComponent,
    image: { merge: read.imageMerge, type: read.image?.type ?? null },
    parents: read.parents,
    result,
  });
  return result;
}
