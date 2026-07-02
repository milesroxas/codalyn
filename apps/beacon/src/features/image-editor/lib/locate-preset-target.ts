import {
  type BareImageInstancePresetTargetKey,
  type ComponentImageElementPresetTargetKey,
  type ComponentImageInstancePresetTargetKey,
  isInstancePresetTargetKey,
  type PresetTargetKey,
  readPageIdFromInstancePresetTargetKey,
} from "@codalyn/webflow-kit";

import { WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import {
  ensureComponentInstanceOnPage,
  findComponentInstanceByDefinitionIdOnPage,
  removeTemporaryPageComponentInstance,
} from "@/features/image-editor/lib/page-component-instance-for-preset-work";
import {
  collectAllPageElementsForImageScan,
  type ImagePageTarget,
} from "@/features/image-editor/lib/scan-image-targets-on-page";
import { searchComponentInstanceImageProps } from "@/features/image-editor/lib/search-component-instance-image-props";
import { preparePageCanvasForWork } from "@/shared/lib/component-definition-scope";
import { runExclusiveDesignerOp } from "@/shared/lib/exclusive-designer-op";

export type PresetLocateAction = { kind: "find-on-canvas"; label: string; pendingLabel: string } | { kind: "none" };

export type LocatePresetTargetResult =
  | {
      ok: true;
      target: ImagePageTarget | null;
      navigatedToComponent: boolean;
      temporaryInstance?: ComponentElement | null;
    }
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
  const inst = await findComponentInstanceByDefinitionIdOnPage(targetKey.componentDefinitionId);
  if (inst == null) {
    return null;
  }
  return await imagePageTargetFromComponentInstance(inst, targetKey.imagePropId);
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

export type ComponentPresetPlacementCheck =
  | { ok: true; needsPlacement: false; instance: ComponentElement | null }
  | { ok: true; needsPlacement: true; componentName: string }
  | { ok: false; error: string };

/**
 * Answers "would locating this preset place a temporary component instance on the page?"
 * without mutating the canvas, so the UI can ask for consent before {@link locatePresetTarget} places one.
 *
 * A found instance is returned so the follow-up locate can reuse it — skipping a second page scan
 * and preventing an unconsented placement if the instance disappears between check and locate.
 */
export async function checkComponentPresetPlacementNeeded(input: {
  targetKey: PresetTargetKey;
  siteId: string | null;
  /** Last known page id — used to leave a component canvas before the page scan. */
  pageIdHint?: string | null;
}): Promise<ComponentPresetPlacementCheck> {
  const targetKey = input.targetKey;
  if (targetKey.kind !== "component-image") {
    return { ok: true, needsPlacement: false, instance: null };
  }
  const siteError = siteMismatchError(input.siteId, targetKey);
  if (siteError != null) {
    return { ok: false, error: siteError };
  }
  const pageId = resolvePageIdForInstancePresetWork(targetKey, input.pageIdHint);
  try {
    return await runExclusiveDesignerOp(async () => {
      await preparePageCanvasForWork(pageId);
      const existing = await findComponentInstanceByDefinitionIdOnPage(targetKey.componentDefinitionId);
      if (existing != null) {
        return { ok: true, needsPlacement: false, instance: existing } as const;
      }
      const definition = await webflow.getComponent(targetKey.componentDefinitionId);
      const componentName = (await definition.getName().catch(() => null)) || "this component";
      return { ok: true, needsPlacement: true, componentName } as const;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not scan the page for this component.";
    return { ok: false, error: message };
  }
}

async function locateComponentImagePresetTarget(
  targetKey: Extract<PresetTargetKey, { kind: "component-image" }>,
  pageIdHint: string | null | undefined,
  knownInstance: ComponentElement | null
): Promise<LocatePresetTargetResult> {
  const pageId = resolvePageIdForInstancePresetWork(targetKey, pageIdHint);
  let instance: ComponentElement;
  let temporary = false;
  try {
    ({ instance, temporary } = await ensureComponentInstanceOnPage({
      componentDefinitionId: targetKey.componentDefinitionId,
      pageIdHint: pageId,
      instance: knownInstance,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not place this component on the page.";
    return { ok: false, error: message };
  }

  const target = await imagePageTargetFromComponentInstance(instance, targetKey.imagePropId);
  if (target == null) {
    if (temporary) {
      await removeTemporaryPageComponentInstance(instance);
    }
    return {
      ok: false,
      error: "Could not resolve the image field for this component preset.",
    };
  }
  await selectCanvasElement(target.element);
  return {
    ok: true,
    target,
    navigatedToComponent: false,
    temporaryInstance: temporary ? instance : null,
  };
}

async function locateCanvasPresetTarget(
  targetKey:
    | BareImageInstancePresetTargetKey
    | ComponentImageInstancePresetTargetKey
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
  /** Instance found by {@link checkComponentPresetPlacementNeeded} — reused instead of re-scanning the page. */
  knownComponentInstance?: ComponentElement | null;
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
      if (input.targetKey.kind === "component-image") {
        return await locateComponentImagePresetTarget(
          input.targetKey,
          pageIdHint,
          input.knownComponentInstance ?? null
        );
      }
      if (
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
