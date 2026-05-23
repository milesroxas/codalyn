import type { ResolverOutput } from "@codalyn/webflow-kit";

import { MAX_EDGE } from "@/features/image-editor/lib/apply-cropped-export";

type Dimensions = {
  width: number;
  height: number;
};

type AdvisoryComparison = "source-larger" | "source-smaller";

export type ImageEditorNaturalSizeAdvisory = {
  natural: Dimensions;
  comparison: Dimensions;
  comparisonKind: AdvisoryComparison;
  canApplySuggestion: boolean;
  suggestedSessionWidth: number;
  suggestedSessionHeight: number;
};

export type ApplyNaturalSizeSuggestionResult = {
  width: number;
  height: number;
  widthStr: string;
  heightStr: string;
  cropFrameMode: "custom";
  aspectPreset: "free";
};

const LARGER_THRESHOLD_RATIO = 1.5;
const SMALLER_THRESHOLD_RATIO = 0.75;

function isPositiveInt(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function shouldShowLargerAdvisory(natural: Dimensions, comparison: Dimensions): boolean {
  return (
    natural.width >= Math.round(comparison.width * LARGER_THRESHOLD_RATIO) ||
    natural.height >= Math.round(comparison.height * LARGER_THRESHOLD_RATIO)
  );
}

function shouldShowSmallerAdvisory(natural: Dimensions, comparison: Dimensions): boolean {
  return (
    natural.width <= Math.round(comparison.width * SMALLER_THRESHOLD_RATIO) ||
    natural.height <= Math.round(comparison.height * SMALLER_THRESHOLD_RATIO)
  );
}

export function resolveImageEditorNaturalSizeAdvisory(input: {
  enabled: boolean;
  dismissed: boolean;
  naturalSize: Dimensions | null;
  comparisonSize: Dimensions | null;
  resolverSource: ResolverOutput["source"] | "manual";
  taggedDimensionsActive: boolean;
  canEditSessionDimensions: boolean;
}): ImageEditorNaturalSizeAdvisory | null {
  const {
    enabled,
    dismissed,
    naturalSize,
    comparisonSize,
    resolverSource,
    taggedDimensionsActive,
    canEditSessionDimensions,
  } = input;

  if (!enabled || dismissed || naturalSize == null || comparisonSize == null) {
    return null;
  }

  if (
    !isPositiveInt(naturalSize.width) ||
    !isPositiveInt(naturalSize.height) ||
    !isPositiveInt(comparisonSize.width) ||
    !isPositiveInt(comparisonSize.height)
  ) {
    return null;
  }

  const comparisonKind = shouldShowLargerAdvisory(naturalSize, comparisonSize)
    ? "source-larger"
    : shouldShowSmallerAdvisory(naturalSize, comparisonSize)
      ? "source-smaller"
      : null;

  if (comparisonKind == null) {
    return null;
  }

  const suggestedSessionWidth = Math.min(MAX_EDGE, naturalSize.width);
  const suggestedSessionHeight = Math.min(MAX_EDGE, naturalSize.height);
  const canApplySuggestion =
    canEditSessionDimensions &&
    !taggedDimensionsActive &&
    resolverSource === "manual" &&
    (suggestedSessionWidth !== comparisonSize.width || suggestedSessionHeight !== comparisonSize.height);

  return {
    natural: naturalSize,
    comparison: comparisonSize,
    comparisonKind,
    canApplySuggestion,
    suggestedSessionWidth,
    suggestedSessionHeight,
  };
}

export function applyNaturalSizeSuggestionToSession(input: {
  width: number;
  height: number;
}): ApplyNaturalSizeSuggestionResult {
  const width = Math.min(MAX_EDGE, Math.max(1, Math.round(input.width)));
  const height = Math.min(MAX_EDGE, Math.max(1, Math.round(input.height)));
  return {
    width,
    height,
    widthStr: String(width),
    heightStr: String(height),
    cropFrameMode: "custom",
    aspectPreset: "free",
  };
}
