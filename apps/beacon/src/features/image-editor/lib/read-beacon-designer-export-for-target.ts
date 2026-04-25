import { readBeaconDesignerExportDimensionsFromImage } from "@/features/image-editor/lib/beacon-designer-image-export-attrs";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { withImageElementForPageTarget } from "@/features/image-editor/lib/with-image-element-for-page-target";

/**
 * Reads `data-beacon-export-width` / `data-beacon-export-height` from the target image (direct or inside a
 * component instance). Returns `null` if attributes are missing or the image could not be resolved.
 */
export async function readBeaconDesignerExportForTarget(
  t: ImagePageTarget
): Promise<{ width: number; height: number } | null> {
  return withImageElementForPageTarget(
    t,
    async (img) => {
      if (img == null) {
        return null;
      }
      return readBeaconDesignerExportDimensionsFromImage(img);
    },
    { onComponentEnterFailed: () => null }
  );
}
