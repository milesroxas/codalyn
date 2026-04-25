import type { PlacementMode } from "@/features/image-editor/lib/apply-cropped-export";
import { WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import type { ComponentImagePropOption } from "@/features/image-editor/lib/component-image-prop";

export type ElementCmsBindingResolution = "none" | "single" | "multiple";

export function isCmsPrimaryUploadContext(options: {
  currentCmsItemId: string | null;
  placement: PlacementMode;
  selectedElementType: string | null;
  elementCmsBinding: ElementCmsBindingResolution;
  elementCmsBindingLoading: boolean;
  componentImagePropsResolving: boolean;
  componentImageProps: ComponentImagePropOption[];
  selectedComponentImagePropId: string | null;
}): boolean {
  const {
    currentCmsItemId,
    placement,
    selectedElementType,
    elementCmsBinding,
    elementCmsBindingLoading,
    componentImagePropsResolving,
    componentImageProps,
    selectedComponentImagePropId,
  } = options;

  if (!currentCmsItemId || placement === "canvas" || placement === "library" || placement === "download") {
    return false;
  }

  if (elementCmsBinding === "multiple") {
    return false;
  }

  if (placement === "replace") {
    if (selectedElementType !== WEBFLOW_IMAGE_ELEMENT_TYPE || elementCmsBindingLoading) {
      return false;
    }
    // Collection item is open: push file into the item via Data API (v2) / Designer replace — no Asset folder step.
    return true;
  }

  if (placement !== "selection") {
    return false;
  }

  if (selectedElementType === "ComponentInstance") {
    if (componentImagePropsResolving) {
      return false;
    }
    const prop = componentImageProps.find((p) => p.propId === selectedComponentImagePropId);
    return prop?.isCmsBinding === true;
  }

  if (selectedElementType === WEBFLOW_IMAGE_ELEMENT_TYPE) {
    if (elementCmsBindingLoading) {
      return false;
    }
    // Bound field may not surface as a single "single" from searchSettings; still prefer the live item (Data API).
    return true;
  }

  return elementCmsBinding === "single";
}
