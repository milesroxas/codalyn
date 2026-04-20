import type { PlacementMode } from "@/features/image-editor/lib/apply-cropped-export";
import { WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import type { ComponentImagePropOption } from "@/features/image-editor/lib/component-image-prop";

export type ElementCmsBindingResolution = "none" | "single" | "multiple";

export function isCmsPrimaryUploadContext(options: {
  currentCmsItemId: string | null;
  placement: PlacementMode;
  selectedElementType: string | null;
  elementCmsBinding: ElementCmsBindingResolution;
  componentImagePropsResolving: boolean;
  componentImageProps: ComponentImagePropOption[];
  selectedComponentImagePropId: string | null;
}): boolean {
  const {
    currentCmsItemId,
    placement,
    selectedElementType,
    elementCmsBinding,
    componentImagePropsResolving,
    componentImageProps,
    selectedComponentImagePropId,
  } = options;

  if (!currentCmsItemId || placement === "canvas" || placement === "library" || placement === "download") {
    return false;
  }

  if (placement === "replace") {
    return selectedElementType === WEBFLOW_IMAGE_ELEMENT_TYPE && elementCmsBinding === "single";
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

  return elementCmsBinding === "single";
}
