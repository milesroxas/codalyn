import {
  BEACON_EXPORT_HEIGHT_ATTR,
  BEACON_EXPORT_WIDTH_ATTR,
} from "@/features/image-editor/lib/beacon-designer-image-export-attrs";
import { clampExportDimensionsToMaxEdge } from "@/features/image-editor/lib/clamp-export-dimensions";
import {
  clearExportDimensionDefaultValuesOnDefinition,
  ensureBeaconExportDimensionPropsOnDefinition,
  ensureBeaconExportDimensionPropsOnOpenDefinition,
  getBeaconExportDimensionPropIdsOrNull,
} from "@/features/image-editor/lib/ensure-beacon-export-dimension-props";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { searchComponentInstanceImageProps } from "@/features/image-editor/lib/search-component-instance-image-props";
import {
  resolveComponentImagePropId,
  withImageElementForPageTarget,
} from "@/features/image-editor/lib/with-image-element-for-page-target";
import {
  withComponentDefinitionScope,
  withOpenComponentDefinitionCanvas,
} from "@/shared/lib/component-definition-scope";
import { runExclusiveDesignerOp } from "@/shared/lib/exclusive-designer-op";

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
  height: number,
  options?: { pageIdHint?: string | null }
): Promise<void> {
  const clamped = clampExportDimensionsToMaxEdge(width, height);
  const wStr = String(clamped.width);
  const hStr = String(clamped.height);
  const pageIdHint = options?.pageIdHint ?? null;

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
      const propIds = await withComponentDefinitionScope(
        instance,
        async ({ definition, definitionRoot }) =>
          ensureBeaconExportDimensionPropsOnDefinition(
            definition,
            instance,
            imagePropId,
            definitionRoot,
            instanceImageProps
          ),
        { pageIdHint }
      );
      await instance.setProps([
        { propId: propIds.widthPropId, value: wStr },
        { propId: propIds.heightPropId, value: hStr },
      ]);
    });
  }
}

/**
 * Tags a component **definition** (library) for a component-scoped preset: ensures Beacon export props,
 * binds `data-beacon-export-*` on the bound image, and sets default width/height on the definition.
 * Works without a page instance — uses `openCanvas(component)` like preset locate.
 */
export async function setBeaconDesignerExportAttrsOnComponentDefinition(input: {
  componentDefinitionId: string;
  imagePropId: string;
  width: number;
  height: number;
  pageIdHint?: string | null;
}): Promise<void> {
  const clamped = clampExportDimensionsToMaxEdge(input.width, input.height);
  const wStr = String(clamped.width);
  const hStr = String(clamped.height);

  await withOpenComponentDefinitionCanvas(
    input.componentDefinitionId,
    async ({ definition, definitionRoot }) => {
      await ensureBeaconExportDimensionPropsOnOpenDefinition(definition, definitionRoot, input.imagePropId, wStr, hStr);
    },
    { pageIdHint: input.pageIdHint ?? null }
  );
}

/**
 * Clears Beacon export width/height **default values** on a component definition. Prop bindings are left in place
 * (same policy as instance preset delete, which clears values but not props).
 */
export async function clearBeaconDesignerExportAttrsOnComponentDefinition(input: {
  componentDefinitionId: string;
  pageIdHint?: string | null;
}): Promise<void> {
  await withOpenComponentDefinitionCanvas(
    input.componentDefinitionId,
    async ({ definition }) => {
      const propIds = await getBeaconExportDimensionPropIdsOrNull(definition);
      if (propIds == null) {
        return;
      }
      await clearExportDimensionDefaultValuesOnDefinition(definition, propIds);
    },
    { pageIdHint: input.pageIdHint ?? null }
  );
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
