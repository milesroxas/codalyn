import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBeaconExportDimensionPropIdsOrNull } from "@/features/image-editor/lib/ensure-beacon-export-dimension-props";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import {
  mapSelectedTargetToResolvedUploadTarget,
  parseTaggedDimensionsFromAttrs,
} from "./image-editor-resolved-target";

const { readAttrsMock } = vi.hoisted(() => ({
  readAttrsMock: vi.fn(),
}));

vi.mock("@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target", () => ({
  readBeaconDesignerExportAttrsFromPageTarget: readAttrsMock,
}));
vi.mock("@/features/image-editor/lib/ensure-beacon-export-dimension-props", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/image-editor/lib/ensure-beacon-export-dimension-props")
  >("@/features/image-editor/lib/ensure-beacon-export-dimension-props");
  return {
    ...actual,
    getBeaconExportDimensionPropIdsOrNull: vi.fn(),
  };
});

function imageTarget(elementId = "img-1"): ImagePageTarget {
  return {
    id: "image-target",
    kind: "image",
    label: "Image",
    element: { type: "Image", id: { component: "cmp-a", element: elementId } } as unknown as AnyElement,
  };
}

function componentTarget(
  imagePropId = "prop-image",
  tagged: { width: string; height: string } | null = { width: "640", height: "360" }
): ImagePageTarget {
  const stringProps =
    tagged == null
      ? []
      : [
          {
            propId: "beacon-width-prop",
            value: { sourceType: "static", value: tagged.width },
          },
          {
            propId: "beacon-height-prop",
            value: { sourceType: "static", value: tagged.height },
          },
        ];
  return {
    id: "component-target",
    kind: "component",
    label: "Component",
    imagePropId,
    element: {
      type: "ComponentInstance",
      id: { component: "cmp-def", element: "inst-1" },
      searchProps: vi.fn().mockResolvedValue(stringProps),
      getComponent: vi.fn().mockResolvedValue({ id: "cmp-def" }),
    } as unknown as AnyElement,
  };
}

describe("parseTaggedDimensionsFromAttrs", () => {
  it("parses valid integer width and height", () => {
    expect(parseTaggedDimensionsFromAttrs({ width: "1200", height: "800" })).toEqual({ width: 1200, height: 800 });
  });

  it("ignores invalid or partial pairs", () => {
    expect(parseTaggedDimensionsFromAttrs({ width: "1200", height: "" })).toBeNull();
    expect(parseTaggedDimensionsFromAttrs({ width: "1200.5", height: "800" })).toBeNull();
    expect(parseTaggedDimensionsFromAttrs({ width: "0", height: "800" })).toBeNull();
    expect(parseTaggedDimensionsFromAttrs({ width: "-12", height: "800" })).toBeNull();
    expect(parseTaggedDimensionsFromAttrs({ width: "abc", height: "800" })).toBeNull();
  });
});

describe("mapSelectedTargetToResolvedUploadTarget", () => {
  beforeEach(() => {
    readAttrsMock.mockReset();
    vi.mocked(getBeaconExportDimensionPropIdsOrNull).mockResolvedValue({
      widthPropId: "beacon-width-prop",
      heightPropId: "beacon-height-prop",
    });
  });

  it("maps a standalone image target", async () => {
    readAttrsMock.mockResolvedValue({ width: "1024", height: "512" });
    await expect(
      mapSelectedTargetToResolvedUploadTarget({
        siteId: "site-1",
        pageId: "page-1",
        autoPageTarget: imageTarget("img-22"),
        selectedElement: null,
        selectedComponentImagePropId: null,
        elementCmsBinding: "none",
      })
    ).resolves.toEqual({
      kind: "bare-image",
      siteId: "site-1",
      pageId: "page-1",
      elementId: "img-22",
      tagged: { width: 1024, height: 512 },
    });
  });

  it("maps a component image prop target", async () => {
    await expect(
      mapSelectedTargetToResolvedUploadTarget({
        siteId: "site-1",
        pageId: "page-1",
        autoPageTarget: componentTarget("hero-image"),
        selectedElement: null,
        selectedComponentImagePropId: "hero-image",
        elementCmsBinding: "none",
      })
    ).resolves.toEqual({
      kind: "component-image",
      siteId: "site-1",
      pageId: "page-1",
      instanceElementId: "inst-1",
      componentDefinitionId: "cmp-def",
      imagePropId: "hero-image",
      tagged: { width: 640, height: 360 },
    });
  });

  it("returns cms-ambiguous when cms binding cannot map to target", async () => {
    await expect(
      mapSelectedTargetToResolvedUploadTarget({
        siteId: "site-1",
        pageId: "page-1",
        autoPageTarget: null,
        selectedElement: { type: "DivBlock", id: { component: "cmp-a", element: "div-1" } } as unknown as AnyElement,
        selectedComponentImagePropId: null,
        elementCmsBinding: "multiple",
      })
    ).resolves.toEqual({
      kind: "cms-ambiguous",
      siteId: "site-1",
    });
  });
});
