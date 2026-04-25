import { clampExportDimensionsToMaxEdge } from "@/features/image-editor/lib/clamp-export-dimensions";

const DEFAULT_LONG_EDGE = 1920;
const RATIO_16_9 = 16 / 9;

export type AssetDimensions = { w?: number; h?: number };

export type AspectSource = "image-style" | "parent-style" | "asset" | "default" | "designer-tag";
export type LongEdgeSource = "asset" | "default" | "designer-tag";

export type ExportDimensionInferenceSource = "aspect-chain" | "designer-tag";

export type AspectResolution = {
  aspect: number;
  aspectSource: AspectSource;
  /** Class name / label of the ancestor when `aspectSource === "parent-style"`. */
  aspectSourceLabel?: string;
};

export type ExportDimensions = {
  width: number;
  height: number;
  note: string;
  aspect: number;
  aspectSource: AspectSource;
  longEdge: number;
  longEdgeSource: LongEdgeSource;
  inferenceSource: ExportDimensionInferenceSource;
};

function hasAssetDimensions(a: AssetDimensions): a is { w: number; h: number } {
  return a.w != null && a.h != null && a.w > 0 && a.h > 0;
}

/**
 * Resolves an aspect ratio from (1) the image element, (2) the first ancestor with a
 * parseable `aspect-ratio`, (3) the bound asset's intrinsic ratio, (4) a 16:9 default.
 */
export function resolveAspect(
  imageAspect: number | undefined,
  parents: { aspect: number | undefined; label?: string }[],
  asset: AssetDimensions
): AspectResolution {
  if (imageAspect != null && Number.isFinite(imageAspect) && imageAspect > 0) {
    return { aspect: imageAspect, aspectSource: "image-style" };
  }
  for (const p of parents) {
    if (p.aspect != null && Number.isFinite(p.aspect) && p.aspect > 0) {
      return { aspect: p.aspect, aspectSource: "parent-style", aspectSourceLabel: p.label };
    }
  }
  if (hasAssetDimensions(asset)) {
    return { aspect: asset.w / asset.h, aspectSource: "asset" };
  }
  return { aspect: RATIO_16_9, aspectSource: "default" };
}

function pickLongEdge(asset: AssetDimensions): { longEdge: number; longEdgeSource: LongEdgeSource } {
  if (hasAssetDimensions(asset)) {
    return { longEdge: Math.max(asset.w, asset.h), longEdgeSource: "asset" };
  }
  return { longEdge: DEFAULT_LONG_EDGE, longEdgeSource: "default" };
}

function composeFromAspectAndLongEdge(aspect: number, longEdge: number): { w: number; h: number } {
  if (aspect >= 1) {
    return { w: longEdge, h: longEdge / aspect };
  }
  return { w: longEdge * aspect, h: longEdge };
}

function aspectLabel(aspect: number): string {
  const r = Math.round(aspect * 1000) / 1000;
  return `${r}`;
}

function buildNote(
  aspect: number,
  aspectSource: AspectSource,
  aspectSourceLabel: string | undefined,
  longEdge: number,
  longEdgeSource: LongEdgeSource
): string {
  const ar = aspectLabel(aspect);
  const aspectPart =
    aspectSource === "image-style"
      ? `Aspect ${ar} from image style`
      : aspectSource === "parent-style"
        ? `Aspect ${ar} from parent ${aspectSourceLabel ?? "wrapper"}`
        : aspectSource === "asset"
          ? `Aspect ${ar} from file`
          : "Aspect 16:9 (default — no aspect-ratio detected)";
  const edgePart =
    longEdgeSource === "asset" ? `long edge from file (${longEdge}px)` : `long edge default (${longEdge}px)`;
  return `${aspectPart} · ${edgePart}`;
}

/**
 * Produces export `{ width, height, note }` from the image element's aspect, the parent
 * chain's aspects, and the bound asset dimensions. Honest by design: we do not try to
 * compute container pixel widths from the cascade — Webflow Designer returns authored
 * values (often `%`/`vw`/`auto`) that cannot be resolved without a layout engine.
 */
export function computeExportDimensionsFromAspectChain(
  imageAspect: number | undefined,
  parentAspects: { aspect: number | undefined; label?: string }[],
  asset: AssetDimensions
): ExportDimensions {
  const r = resolveAspect(imageAspect, parentAspects, asset);
  const { longEdge, longEdgeSource } = pickLongEdge(asset);
  const { w, h } = composeFromAspectAndLongEdge(r.aspect, longEdge);
  const clamped = clampExportDimensionsToMaxEdge(w, h);
  return {
    width: clamped.width,
    height: clamped.height,
    note: buildNote(r.aspect, r.aspectSource, r.aspectSourceLabel, longEdge, longEdgeSource),
    aspect: r.aspect,
    aspectSource: r.aspectSource,
    longEdge,
    longEdgeSource,
    inferenceSource: "aspect-chain",
  };
}
