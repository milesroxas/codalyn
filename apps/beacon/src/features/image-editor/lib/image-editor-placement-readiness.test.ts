import { describe, expect, it } from "vitest";

import {
  getImageEditorPlacementReadiness,
  type ImageEditorPlacementContext,
  resolvePlacementWhenOptionHidden,
  type SelectionPlacementOfferContext,
  shouldOfferReplacePlacement,
  shouldOfferSelectionPlacement,
} from "./image-editor-placement-readiness";

const baseCtx = (): ImageEditorPlacementContext => ({
  placement: "library",
  hasCompletedCrop: true,
  selectedElementType: null,
  componentImagePropsResolving: false,
  componentImagePropCount: 0,
  selectedComponentImagePropId: null,
});

describe("getImageEditorPlacementReadiness", () => {
  it("blocks when crop is incomplete", () => {
    const ctx = { ...baseCtx(), hasCompletedCrop: false };
    expect(getImageEditorPlacementReadiness(ctx)).toEqual({ ok: false, blocker: "missing-crop" });
  });

  it("allows library, canvas, and download with completed crop", () => {
    for (const placement of ["library", "canvas", "download"] as const) {
      expect(getImageEditorPlacementReadiness({ ...baseCtx(), placement })).toEqual({ ok: true });
    }
  });

  it("replace requires Image element type", () => {
    expect(
      getImageEditorPlacementReadiness({ ...baseCtx(), placement: "replace", selectedElementType: "Div" })
    ).toEqual({ ok: false, blocker: "replace-wrong-type" });
    expect(
      getImageEditorPlacementReadiness({ ...baseCtx(), placement: "replace", selectedElementType: "Image" })
    ).toEqual({ ok: true });
  });

  it("selection requires element and resolved component props", () => {
    expect(getImageEditorPlacementReadiness({ ...baseCtx(), placement: "selection" })).toEqual({
      ok: false,
      blocker: "selection-empty",
    });
    expect(
      getImageEditorPlacementReadiness({
        ...baseCtx(),
        placement: "selection",
        selectedElementType: "ComponentInstance",
        componentImagePropsResolving: true,
      })
    ).toEqual({ ok: false, blocker: "selection-props-loading" });
    expect(
      getImageEditorPlacementReadiness({
        ...baseCtx(),
        placement: "selection",
        selectedElementType: "ComponentInstance",
        componentImagePropCount: 2,
        selectedComponentImagePropId: null,
      })
    ).toEqual({ ok: false, blocker: "selection-pick-field" });
  });
});

describe("shouldOfferSelectionPlacement", () => {
  const base: SelectionPlacementOfferContext = {
    selectedElementType: null,
    componentImagePropsResolving: false,
    componentImagePropCount: 0,
    elementCmsBinding: "none",
    elementCmsBindingLoading: false,
  };

  it("is false without a selected type", () => {
    expect(shouldOfferSelectionPlacement(base)).toBe(false);
  });

  it("offers for ComponentInstance when props exist or still loading", () => {
    expect(
      shouldOfferSelectionPlacement({
        ...base,
        selectedElementType: "ComponentInstance",
        componentImagePropsResolving: true,
      })
    ).toBe(true);
    expect(
      shouldOfferSelectionPlacement({
        ...base,
        selectedElementType: "ComponentInstance",
        componentImagePropCount: 1,
      })
    ).toBe(true);
  });

  it("offers for plain Image", () => {
    expect(shouldOfferSelectionPlacement({ ...base, selectedElementType: "Image" })).toBe(true);
  });
});

describe("shouldOfferReplacePlacement", () => {
  it("is only true for Image", () => {
    expect(shouldOfferReplacePlacement("Image")).toBe(true);
    expect(shouldOfferReplacePlacement("Div")).toBe(false);
    expect(shouldOfferReplacePlacement(null)).toBe(false);
  });
});

describe("resolvePlacementWhenOptionHidden", () => {
  it("maps hidden modes to safe defaults", () => {
    expect(resolvePlacementWhenOptionHidden("selection", false, true)).toBe("canvas");
    expect(resolvePlacementWhenOptionHidden("replace", true, false)).toBe("library");
  });

  it("preserves placement when options remain valid", () => {
    expect(resolvePlacementWhenOptionHidden("canvas", true, true)).toBe("canvas");
  });
});
