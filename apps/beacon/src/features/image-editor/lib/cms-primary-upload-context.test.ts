import { describe, expect, it } from "vitest";

import { isCmsPrimaryUploadContext } from "./cms-primary-upload-context";

const base = {
  currentCmsItemId: "item-1" as string | null,
  placement: "selection" as const,
  selectedElementType: "Image" as string | null,
  elementCmsBinding: "single" as const,
  elementCmsBindingLoading: false,
  componentImagePropsResolving: false,
  componentImageProps: [] as { propId: string; label: string; isCmsBinding: boolean }[],
  selectedComponentImagePropId: null as string | null,
};

describe("isCmsPrimaryUploadContext", () => {
  it("is true for Image on a collection item even when binding resolution is not single (field save via Data API)", () => {
    expect(
      isCmsPrimaryUploadContext({
        ...base,
        elementCmsBinding: "none",
        selectedElementType: "Image",
      })
    ).toBe(true);
  });

  it("is false when no collection item is open", () => {
    expect(
      isCmsPrimaryUploadContext({
        ...base,
        currentCmsItemId: null,
        elementCmsBinding: "none",
        selectedElementType: "Image",
      })
    ).toBe(false);
  });

  it("hides library folder for replace when a CMS item is open and an Image is selected", () => {
    expect(
      isCmsPrimaryUploadContext({
        ...base,
        placement: "replace",
        elementCmsBinding: "none",
        selectedElementType: "Image",
      })
    ).toBe(true);
  });

  it("is false for library placement", () => {
    expect(
      isCmsPrimaryUploadContext({
        ...base,
        placement: "library",
        elementCmsBinding: "none",
        selectedElementType: "Image",
      })
    ).toBe(false);
  });
});
