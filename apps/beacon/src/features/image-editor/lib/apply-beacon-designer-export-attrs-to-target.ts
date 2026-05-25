import {
  BEACON_EXPORT_HEIGHT_ATTR,
  BEACON_EXPORT_WIDTH_ATTR,
} from "@/features/image-editor/lib/beacon-designer-image-export-attrs";
import { clampExportDimensionsToMaxEdge } from "@/features/image-editor/lib/clamp-export-dimensions";
import {
  clearExportDimensionDefaultValuesOnDefinition,
  ensureBeaconExportDimensionPropsOnDefinition,
  getBeaconExportDimensionPropIdsOrNull,
} from "@/features/image-editor/lib/ensure-beacon-export-dimension-props";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { searchComponentInstanceImageProps } from "@/features/image-editor/lib/search-component-instance-image-props";
import {
  resolveComponentImagePropId,
  withImageElementForPageTarget,
} from "@/features/image-editor/lib/with-image-element-for-page-target";
import { withComponentDefinitionScope } from "@/shared/lib/component-definition-scope";
import { runExclusiveDesignerOp } from "@/shared/lib/exclusive-designer-op";

export type BeaconExportDimensionWriteMode = "instance-props" | "definition-defaults";

type BeaconExportDimensionTargetOptions = {
  pageIdHint?: string | null;
  writeMode?: BeaconExportDimensionWriteMode;
};

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
 * instance**, enters the component definition and either sets instance prop values or definition default values.
 */
export async function setBeaconDesignerExportAttrsOnPageTarget(
  t: ImagePageTarget,
  width: number,
  height: number,
  options?: BeaconExportDimensionTargetOptions
): Promise<void> {
  const clamped = clampExportDimensionsToMaxEdge(width, height);
  const wStr = String(clamped.width);
  const hStr = String(clamped.height);
  const pageIdHint = options?.pageIdHint ?? null;
  const writeMode = options?.writeMode ?? "instance-props";

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

    await runExclusiveDesignerOp(async () => {
      const instanceImageProps = await searchComponentInstanceImageProps(instance);
      await withComponentDefinitionScope(
        instance,
        async ({ definition, definitionRoot }) => {
          const propIds = await ensureBeaconExportDimensionPropsOnDefinition(
            definition,
            instance,
            imagePropId,
            definitionRoot,
            instanceImageProps,
            writeMode === "definition-defaults" ? { defaultValues: { width: wStr, height: hStr } } : undefined
          );
          if (writeMode === "instance-props") {
            await instance.setProps([
              { propId: propIds.widthPropId, value: wStr },
              { propId: propIds.heightPropId, value: hStr },
            ]);
          }
        },
        { pageIdHint }
      );
    });
  }
}

export async function clearBeaconDesignerExportAttrsOnPageTarget(
  t: ImagePageTarget,
  options?: BeaconExportDimensionTargetOptions
): Promise<void> {
  const writeMode = options?.writeMode ?? "instance-props";
  const pageIdHint = options?.pageIdHint ?? null;

  if (t.kind === "component" && writeMode === "definition-defaults") {
    const instance = t.element as ComponentElement;
    await runExclusiveDesignerOp(async () => {
      await withComponentDefinitionScope(
        instance,
        async ({ definition }) => {
          const propIds = await getBeaconExportDimensionPropIdsOrNull(definition);
          if (propIds == null) {
            return;
          }
          await clearExportDimensionDefaultValuesOnDefinition(definition, propIds);
        },
        { pageIdHint }
      );
    });
    return;
  }

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
