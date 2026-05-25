import type {
  BeaconAppSettings,
  BeaconPresetSettingsSnapshot,
  ComponentImagePresetTargetKey,
  PresetTargetKey,
  PresetTargetKeyString,
  ResolvedUploadTarget,
} from "@codalyn/webflow-kit";
import { readBeaconDesignerExportAttrsFromPageTarget } from "@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target";
import type { ElementCmsBindingResolution } from "@/features/image-editor/lib/cms-primary-upload-context";
import { getBeaconExportDimensionPropIdsOrNull } from "@/features/image-editor/lib/ensure-beacon-export-dimension-props";
import { readComponentDefinitionIdForInstance } from "@/features/image-editor/lib/read-component-definition-id";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";

const POSITIVE_INTEGER_RE = /^[1-9]\d*$/;

function parsePositiveInteger(raw: string): number | null {
  const trimmed = raw.trim();
  if (!POSITIVE_INTEGER_RE.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function readStringPropValue(raw: unknown): string | null {
  if (typeof raw === "string") {
    return raw;
  }
  if (raw && typeof raw === "object") {
    const value = (raw as { value?: unknown }).value;
    if (typeof value === "string") {
      return value;
    }
  }
  return null;
}

export function parseTaggedDimensionsFromAttrs(attrs: {
  width: string;
  height: string;
}): { width: number; height: number } | null {
  const width = parsePositiveInteger(attrs.width);
  const height = parsePositiveInteger(attrs.height);
  if (width == null || height == null) {
    return null;
  }
  return { width, height };
}

function asImagePageTarget(
  autoPageTarget: ImagePageTarget | null,
  selectedElement: AnyElement | null,
  selectedComponentImagePropId: string | null
): ImagePageTarget | null {
  if (autoPageTarget != null) {
    return autoPageTarget;
  }
  if (selectedElement == null) {
    return null;
  }
  if (selectedElement.type === "Image") {
    return {
      id: "selected-image",
      kind: "image",
      element: selectedElement,
      label: "Image",
    };
  }
  if (selectedElement.type === "ComponentInstance") {
    return {
      id: "selected-component",
      kind: "component",
      element: selectedElement,
      label: "Component",
      imagePropId: selectedComponentImagePropId ?? undefined,
    };
  }
  return null;
}

function readElementId(element: AnyElement): string | null {
  const elementId = (element.id as { element?: unknown }).element;
  return typeof elementId === "string" && elementId.length > 0 ? elementId : null;
}

async function readTaggedDimensionsFromComponentProps(
  instance: ComponentElement
): Promise<{ width: number; height: number } | null> {
  const component = await instance.getComponent().catch(() => null);
  if (component == null) {
    return null;
  }
  const propIds = await getBeaconExportDimensionPropIdsOrNull(component).catch(() => null);
  if (propIds == null) {
    return null;
  }
  const stringProps = await instance.searchProps({ valueType: "string" }).catch(() => []);
  const widthRaw = stringProps.find((prop) => prop.propId === propIds.widthPropId)?.value;
  const heightRaw = stringProps.find((prop) => prop.propId === propIds.heightPropId)?.value;
  const widthValue = readStringPropValue(widthRaw);
  const heightValue = readStringPropValue(heightRaw);
  if (widthValue == null || heightValue == null) {
    return null;
  }
  return parseTaggedDimensionsFromAttrs({ width: widthValue, height: heightValue });
}

async function resolveTaggedDimensions(target: ImagePageTarget): Promise<{ width: number; height: number } | null> {
  if (target.kind === "component") {
    const instance = target.element as ComponentElement;
    const fromProps = await readTaggedDimensionsFromComponentProps(instance);
    if (fromProps != null) {
      return fromProps;
    }
    const attrs = await readBeaconDesignerExportAttrsFromPageTarget(target);
    return parseTaggedDimensionsFromAttrs(attrs);
  }
  const attrs = await readBeaconDesignerExportAttrsFromPageTarget(target);
  return parseTaggedDimensionsFromAttrs(attrs);
}

export async function mapSelectedTargetToResolvedUploadTarget(input: {
  siteId: string;
  pageId: string;
  autoPageTarget: ImagePageTarget | null;
  selectedElement: AnyElement | null;
  selectedComponentImagePropId: string | null;
  elementCmsBinding: ElementCmsBindingResolution;
  /** When false, skips Designer reads that enter component instances (preset lookup only). */
  shouldResolveTaggedDimensions?: boolean;
}): Promise<ResolvedUploadTarget | null> {
  const {
    siteId,
    pageId,
    autoPageTarget,
    selectedElement,
    selectedComponentImagePropId,
    elementCmsBinding,
    shouldResolveTaggedDimensions = true,
  } = input;
  const target = asImagePageTarget(autoPageTarget, selectedElement, selectedComponentImagePropId);
  if (target == null) {
    if (elementCmsBinding !== "none") {
      return { kind: "cms-ambiguous", siteId };
    }
    return null;
  }

  if (target.kind === "image") {
    const elementId = readElementId(target.element);
    if (elementId == null) {
      return null;
    }
    return {
      kind: "bare-image",
      siteId,
      pageId,
      elementId,
      tagged: shouldResolveTaggedDimensions ? await resolveTaggedDimensions(target) : null,
    };
  }

  const instance = target.element as ComponentElement;
  const instanceElementId = readElementId(instance);
  const imagePropId = target.imagePropId ?? selectedComponentImagePropId;
  if (instanceElementId == null || imagePropId == null || imagePropId.length === 0) {
    return null;
  }
  const componentDefinitionId = await readComponentDefinitionIdForInstance(instance);
  if (componentDefinitionId == null) {
    return null;
  }
  return {
    kind: "component-image",
    siteId,
    pageId,
    instanceElementId,
    componentDefinitionId,
    imagePropId,
    tagged: shouldResolveTaggedDimensions ? await resolveTaggedDimensions(target) : null,
  };
}

export function resolvedUploadTargetFromComponentImagePresetKey(
  siteId: string,
  targetKey: ComponentImagePresetTargetKey
): Exclude<ResolvedUploadTarget, { kind: "cms-ambiguous" }> {
  return {
    kind: "component-image",
    siteId,
    pageId: "",
    instanceElementId: "",
    componentDefinitionId: targetKey.componentDefinitionId,
    imagePropId: targetKey.imagePropId,
    tagged: null,
  };
}

export function isComponentImagePresetTargetKey(
  targetKey: PresetTargetKey
): targetKey is ComponentImagePresetTargetKey {
  return targetKey.kind === "component-image";
}

export function toBeaconPresetSettingsSnapshot(settings: BeaconAppSettings): BeaconPresetSettingsSnapshot {
  const byTargetKey = new Map<PresetTargetKeyString, (typeof settings.imagePresetStorage.byTargetKey)[string]>();
  for (const [key, row] of Object.entries(settings.imagePresetStorage.byTargetKey)) {
    byTargetKey.set(key as PresetTargetKeyString, row);
  }

  return {
    siteDefault: settings.imagePresetStorage.siteDefault,
    byTargetKey,
    defaults: {
      exportFormat: settings.defaultExportFormat,
      exportQuality: settings.defaultExportQuality,
    },
  };
}
