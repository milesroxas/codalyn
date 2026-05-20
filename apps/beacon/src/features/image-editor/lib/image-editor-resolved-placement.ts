import type { PlacementMode } from "@/features/image-editor/lib/apply-cropped-export";
import { resolvePlacementWhenOptionHidden } from "@/features/image-editor/lib/image-editor-placement-readiness";

export function resolveImageEditorPlacement(options: {
  placement: PlacementMode;
  offerSelectionPlacement: boolean;
  offerReplacePlacement: boolean;
  guestCmsTemplateRestricted: boolean;
}): PlacementMode {
  const { placement, offerSelectionPlacement, offerReplacePlacement, guestCmsTemplateRestricted } = options;
  let resolved = resolvePlacementWhenOptionHidden(placement, offerSelectionPlacement, offerReplacePlacement);
  if (guestCmsTemplateRestricted) {
    if (resolved !== "library" && resolved !== "download") {
      resolved = "library";
    }
  } else if (resolved === "download") {
    resolved = "library";
  }
  return resolved;
}
