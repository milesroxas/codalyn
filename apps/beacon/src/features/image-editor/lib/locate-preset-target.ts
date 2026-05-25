import {
  type BareImageInstancePresetTargetKey,
  type ComponentImageElementPresetTargetKey,
  type ComponentImageInstancePresetTargetKey,
  type ComponentImagePresetTargetKey,
  isInstancePresetTargetKey,
  type PresetTargetKey,
  readPageIdFromInstancePresetTargetKey,
} from "@codalyn/webflow-kit";

import { WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import { readComponentDefinitionIdForInstance } from "@/features/image-editor/lib/read-component-definition-id";
import {
  collectAllPageElementsForImageScan,
  type ImagePageTarget,
} from "@/features/image-editor/lib/scan-image-targets-on-page";
import { searchComponentInstanceImageProps } from "@/features/image-editor/lib/search-component-instance-image-props";
import { preparePageCanvasForWork } from "@/shared/lib/component-definition-scope";
import { runExclusiveDesignerOp } from "@/shared/lib/exclusive-designer-op";

export type PresetLocateAction = { kind: "find-on-canvas"; label: string; pendingLabel: string } | { kind: "none" };

export type LocatePresetTargetResult =
  | { ok: true; target: ImagePageTarget | null; navigatedToComponent: boolean }
  | { ok: false; error: string };

function readElementId(element: AnyElement): string | null {
  const elementId = (element.id as { element?: unknown }).element;
  return typeof elementId === "string" && elementId.length > 0 ? elementId : null;
}

function imagePropLabelFrom(prop: InstanceProp): string {
  const label = prop.display?.label;
  return label && label.length > 0 ? label : "Image field";
}

async function imagePageTargetFromBareImage(el: ImageElement): Promise<ImagePageTarget> {
  return {
    id: `locate-image-${readElementId(el) ?? "unknown"}`,
    kind: "image",
    element: el,
    label: "Image",
  };
}

async function imagePageTargetFromComponentInstance(
  inst: ComponentElement,
  imagePropId: string
): Promise<ImagePageTarget | null> {
  const props = await searchComponentInstanceImageProps(inst);
  const prop = props.find((candidate) => candidate.propId === imagePropId);
  if (prop == null) {
    return null;
  }
  const comp = await inst.getComponent();
  const cname = (await comp.getName()) || "Component";
  return {
    id: `locate-comp-${readElementId(inst) ?? "unknown"}`,
    kind: "component",
    element: inst,
    label: cname,
    imagePropId,
    imagePropLabel: imagePropLabelFrom(prop),
  };
}

export function getPresetLocateAction(targetKey: PresetTargetKey): PresetLocateAction {
  switch (targetKey.kind) {
    case "component-image":
    case "component-image-element":
    case "component-image-instance":
    case "bare-image-instance":
      return {
        kind: "find-on-canvas",
        label: "Find on canvas",
        pendingLabel: "Finding…",
      };
    default:
      return { kind: "none" };
  }
}

function siteMismatchError(siteId: string | null, targetKey: PresetTargetKey): string | null {
  if (siteId == null) {
    return "Could not resolve site context.";
  }
  if (targetKey.siteId !== siteId) {
    return "This preset belongs to a different site.";
  }
  return null;
}

async function selectCanvasElement(element: AnyElement): Promise<void> {
  await webflow.setSelectedElement(element);
}

async function findBareImageInstanceTarget(targetKey: Extract<PresetTargetKey, { kind: "bare-image-instance" }>) {
  const all = await collectAllPageElementsForImageScan();
  for (const el of all) {
    if (el.type !== WEBFLOW_IMAGE_ELEMENT_TYPE) {
      continue;
    }
    if (readElementId(el) !== targetKey.elementId) {
      continue;
    }
    return await imagePageTargetFromBareImage(el as ImageElement);
  }
  return null;
}

async function findComponentImageInstanceTarget(
  targetKey: Extract<PresetTargetKey, { kind: "component-image-instance" }>
) {
  const all = await collectAllPageElementsForImageScan();
  for (const el of all) {
    if (el.type !== "ComponentInstance") {
      continue;
    }
    if (readElementId(el) !== targetKey.instanceElementId) {
      continue;
    }
    return await imagePageTargetFromComponentInstance(el as ComponentElement, targetKey.imagePropId);
  }
  return null;
}

async function findComponentImageTarget(targetKey: Extract<PresetTargetKey, { kind: "component-image" }>) {
  const all = await collectAllPageElementsForImageScan();
  for (const el of all) {
    if (el.type !== "ComponentInstance") {
      continue;
    }
    const inst = el as ComponentElement;
    const definitionId = await readComponentDefinitionIdForInstance(inst);
    if (definitionId !== targetKey.componentDefinitionId) {
      continue;
    }
    return await imagePageTargetFromComponentInstance(inst, targetKey.imagePropId);
  }
  return null;
}

export async function findImagePageTargetForPresetOnCurrentPage(
  targetKey: PresetTargetKey
): Promise<ImagePageTarget | null> {
  if (targetKey.kind === "bare-image-instance") {
    return findBareImageInstanceTarget(targetKey);
  }
  if (targetKey.kind === "component-image-instance") {
    return findComponentImageInstanceTarget(targetKey);
  }
  if (targetKey.kind === "component-image") {
    return findComponentImageTarget(targetKey);
  }
  return null;
}

export function resolvePageIdForInstancePresetWork(
  targetKey: PresetTargetKey,
  pageIdHint?: string | null
): string | null {
  if (isInstancePresetTargetKey(targetKey)) {
    return readPageIdFromInstancePresetTargetKey(targetKey);
  }
  return pageIdHint ?? null;
}

async function locateCanvasPresetTarget(
  targetKey:
    | BareImageInstancePresetTargetKey
    | ComponentImageInstancePresetTargetKey
    | ComponentImagePresetTargetKey
    | ComponentImageElementPresetTargetKey,
  pageIdHint: string | null | undefined
): Promise<LocatePresetTargetResult> {
  const pageId = resolvePageIdForInstancePresetWork(targetKey, pageIdHint);
  await preparePageCanvasForWork(pageId);
  const target = await findImagePageTargetForPresetOnCurrentPage(targetKey);
  if (target == null) {
    return {
      ok: false,
      error: "Could not find this preset target on the page. It may have been removed or moved.",
    };
  }
  await selectCanvasElement(target.element);
  return { ok: true, target, navigatedToComponent: false };
}

export async function locatePresetTarget(input: {
  targetKey: PresetTargetKey;
  siteId: string | null;
  /** Last known page id — used to leave a component canvas before page-scoped locate work. */
  pageIdHint?: string | null;
}): Promise<LocatePresetTargetResult> {
  const siteError = siteMismatchError(input.siteId, input.targetKey);
  if (siteError != null) {
    return { ok: false, error: siteError };
  }

  const action = getPresetLocateAction(input.targetKey);
  if (action.kind === "none") {
    return { ok: false, error: "This preset has no canvas target to locate." };
  }

  const pageIdHint = resolvePageIdForInstancePresetWork(input.targetKey, input.pageIdHint);

  try {
    return await runExclusiveDesignerOp(async () => {
      if (
        input.targetKey.kind === "component-image" ||
        input.targetKey.kind === "component-image-element" ||
        input.targetKey.kind === "component-image-instance" ||
        input.targetKey.kind === "bare-image-instance"
      ) {
        return await locateCanvasPresetTarget(input.targetKey, pageIdHint);
      }
      return { ok: false, error: "This preset has no canvas target to locate." };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not locate this preset target.";
    return { ok: false, error: message };
  }
}
