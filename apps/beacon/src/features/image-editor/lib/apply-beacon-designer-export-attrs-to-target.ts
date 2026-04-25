import {
  BEACON_EXPORT_HEIGHT_ATTR,
  BEACON_EXPORT_WIDTH_ATTR,
} from "@/features/image-editor/lib/beacon-designer-image-export-attrs";
import { clampExportDimensionsToMaxEdge } from "@/features/image-editor/lib/clamp-export-dimensions";
import {
  ensureBeaconExportDimensionPropsOnDefinition,
  getBeaconExportDimensionPropIdsOrNull,
} from "@/features/image-editor/lib/ensure-beacon-export-dimension-props";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import {
  exitCurrentComponentIfAny,
  resolveComponentImagePropId,
  withImageElementForPageTarget,
} from "@/features/image-editor/lib/with-image-element-for-page-target";

export async function readBeaconDesignerExportAttrsFromPageTarget(
  t: ImagePageTarget
): Promise<{ width: string; height: string }> {
  return withImageElementForPageTarget(t, async (img) => {
    if (img == null || img.customAttributes !== true) {
      return { width: "", height: "" };
    }
    const [w, h] = await Promise.all([
      img.getCustomAttribute(BEACON_EXPORT_WIDTH_ATTR).catch(() => null),
      img.getCustomAttribute(BEACON_EXPORT_HEIGHT_ATTR).catch(() => null),
    ]);
    return { width: w?.trim() ?? "", height: h?.trim() ?? "" };
  });
}

/**
 * Sets both Beacon export dimension tags. On a **plain Image**, writes custom attributes. On a **component
 * instance**, ensures two `string` props and binds their values to `data-beacon-export-width` /
 * `data-beacon-export-height` on the bound image, then sets those props for this instance.
 */
export async function setBeaconDesignerExportAttrsOnPageTarget(
  t: ImagePageTarget,
  width: number,
  height: number
): Promise<void> {
  const clamped = clampExportDimensionsToMaxEdge(width, height);
  const wStr = String(clamped.width);
  const hStr = String(clamped.height);

  if (t.kind === "image") {
    const img = t.element as ImageElement;
    if (img.customAttributes !== true) {
      throw new Error("This image does not support custom attributes in the Designer API.");
    }
    await img.setCustomAttribute(BEACON_EXPORT_WIDTH_ATTR, wStr);
    await img.setCustomAttribute(BEACON_EXPORT_HEIGHT_ATTR, hStr);
    return;
  }

  if (t.kind === "component") {
    const instance = t.element as ComponentElement;
    const imagePropId = await resolveComponentImagePropId(instance, t.imagePropId);
    if (imagePropId == null) {
      throw new Error("This component has no image field Beacon can use.");
    }
    await exitCurrentComponentIfAny();
    await webflow.enterComponent(instance);
    let propIds: { widthPropId: string; heightPropId: string };
    try {
      const def = await webflow.getCurrentComponent();
      if (def == null) {
        throw new Error("Select this component on the page and try again.");
      }
      propIds = await ensureBeaconExportDimensionPropsOnDefinition(def, instance, imagePropId);
    } finally {
      await webflow.exitComponent();
    }
    await instance.setProps([
      { propId: propIds.widthPropId, value: wStr },
      { propId: propIds.heightPropId, value: hStr },
    ]);
    return;
  }
}

export async function clearBeaconDesignerExportAttrsOnPageTarget(t: ImagePageTarget): Promise<void> {
  if (t.kind === "component") {
    const comp = await (t.element as ComponentElement).getComponent();
    const propIds = await getBeaconExportDimensionPropIdsOrNull(comp);
    if (propIds != null) {
      await (t.element as ComponentElement).setProps([
        { propId: propIds.widthPropId, value: "" },
        { propId: propIds.heightPropId, value: "" },
      ]);
      return;
    }
  }
  await withImageElementForPageTarget(t, async (img) => {
    if (img == null || img.customAttributes !== true) {
      return;
    }
    await img.removeCustomAttribute(BEACON_EXPORT_WIDTH_ATTR).catch(() => {});
    await img.removeCustomAttribute(BEACON_EXPORT_HEIGHT_ATTR).catch(() => {});
  });
}
