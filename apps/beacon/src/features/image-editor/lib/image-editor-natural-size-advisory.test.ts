import { describe, expect, it } from "vitest";

import {
  applyNaturalSizeSuggestionToSession,
  resolveImageEditorNaturalSizeAdvisory,
} from "./image-editor-natural-size-advisory";

describe("resolveImageEditorNaturalSizeAdvisory", () => {
  it("shows advisory when source image is much larger than resolved constraints", () => {
    const result = resolveImageEditorNaturalSizeAdvisory({
      enabled: true,
      dismissed: false,
      naturalSize: { width: 2400, height: 1600 },
      comparisonSize: { width: 1200, height: 800 },
      resolverSource: "manual",
      taggedDimensionsActive: false,
      canEditSessionDimensions: true,
    });
    expect(result).toMatchObject({
      comparisonKind: "source-larger",
      canApplySuggestion: true,
      suggestedSessionWidth: 2400,
      suggestedSessionHeight: 1600,
    });
  });

  it("shows advisory when source image is much smaller than resolved constraints", () => {
    const result = resolveImageEditorNaturalSizeAdvisory({
      enabled: true,
      dismissed: false,
      naturalSize: { width: 600, height: 400 },
      comparisonSize: { width: 1200, height: 800 },
      resolverSource: "manual",
      taggedDimensionsActive: false,
      canEditSessionDimensions: true,
    });
    expect(result).toMatchObject({
      comparisonKind: "source-smaller",
      canApplySuggestion: true,
      suggestedSessionWidth: 600,
      suggestedSessionHeight: 400,
    });
  });

  it("does not show advisory when difference is not meaningful", () => {
    const result = resolveImageEditorNaturalSizeAdvisory({
      enabled: true,
      dismissed: false,
      naturalSize: { width: 1280, height: 840 },
      comparisonSize: { width: 1200, height: 800 },
      resolverSource: "manual",
      taggedDimensionsActive: false,
      canEditSessionDimensions: true,
    });
    expect(result).toBeNull();
  });

  it("hides advisory when dismissed", () => {
    const result = resolveImageEditorNaturalSizeAdvisory({
      enabled: true,
      dismissed: true,
      naturalSize: { width: 2400, height: 1600 },
      comparisonSize: { width: 1200, height: 800 },
      resolverSource: "manual",
      taggedDimensionsActive: false,
      canEditSessionDimensions: true,
    });
    expect(result).toBeNull();
  });

  it("keeps tagged target advisory read-only", () => {
    const result = resolveImageEditorNaturalSizeAdvisory({
      enabled: true,
      dismissed: false,
      naturalSize: { width: 3000, height: 2000 },
      comparisonSize: { width: 1200, height: 800 },
      resolverSource: "tagged",
      taggedDimensionsActive: true,
      canEditSessionDimensions: true,
    });
    expect(result).toMatchObject({
      comparisonKind: "source-larger",
      canApplySuggestion: false,
    });
  });

  it("keeps component preset target advisory read-only", () => {
    const result = resolveImageEditorNaturalSizeAdvisory({
      enabled: true,
      dismissed: false,
      naturalSize: { width: 3000, height: 2000 },
      comparisonSize: { width: 1200, height: 800 },
      resolverSource: "instance",
      taggedDimensionsActive: false,
      canEditSessionDimensions: true,
    });
    expect(result).toMatchObject({
      comparisonKind: "source-larger",
      canApplySuggestion: false,
    });
  });

  it("keeps site default target advisory read-only", () => {
    const result = resolveImageEditorNaturalSizeAdvisory({
      enabled: true,
      dismissed: false,
      naturalSize: { width: 3000, height: 2000 },
      comparisonSize: { width: 1200, height: 800 },
      resolverSource: "site-default",
      taggedDimensionsActive: false,
      canEditSessionDimensions: true,
    });
    expect(result).toMatchObject({
      comparisonKind: "source-larger",
      canApplySuggestion: false,
    });
  });

  it("allows manual fallback advisory without changing resolver output", () => {
    const result = resolveImageEditorNaturalSizeAdvisory({
      enabled: true,
      dismissed: false,
      naturalSize: { width: 3000, height: 2000 },
      comparisonSize: { width: 1200, height: 800 },
      resolverSource: "manual",
      taggedDimensionsActive: false,
      canEditSessionDimensions: true,
    });
    expect(result?.canApplySuggestion).toBe(true);
  });
});

describe("applyNaturalSizeSuggestionToSession", () => {
  it("returns session-only dimension updates", () => {
    const result = applyNaturalSizeSuggestionToSession({ width: 1024, height: 768 });
    expect(result).toEqual({
      width: 1024,
      height: 768,
      widthStr: "1024",
      heightStr: "768",
      cropFrameMode: "custom",
      aspectPreset: "free",
    });
  });
});
