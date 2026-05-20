/**
 * - `entry` — designer-only: Add image vs Configuration
 * - `autoElement` — pick an Image / component field on the page
 * - `configurePresets` — export presets and surface tags (designers)
 * - `upload` | `position` | `save` — add file, frame, place
 */
export type ImageEditorPathMode = "unset" | "auto" | "configurations";

export type ImageEditorFlowStep = "entry" | "autoElement" | "configurePresets" | "upload" | "position" | "save";

export type ImageEditorStepOrderOptions = {
  /** When true, `entry` (designer start) is part of the linear order for this path. */
  includeEntryStep: boolean;
};

type NavItem = { id: ImageEditorFlowStep; label: string };

const NAV_START: ImageEditorFlowStep = "entry";

function navAuto(includeEntry: boolean): NavItem[] {
  const core: NavItem[] = [
    { id: "autoElement", label: "Target" },
    { id: "upload", label: "Add" },
    { id: "position", label: "Position" },
    { id: "save", label: "Save" },
  ];
  if (includeEntry) {
    return [{ id: NAV_START, label: "Start" }, ...core];
  }
  return core;
}

function navConfigurations(): NavItem[] {
  return [
    { id: NAV_START, label: "Start" },
    { id: "configurePresets", label: "Presets" },
  ];
}

export function getImageEditorNavSteps(
  pathMode: ImageEditorPathMode,
  orderOpts: ImageEditorStepOrderOptions
): NavItem[] {
  if (pathMode === "unset") {
    return [];
  }
  if (pathMode === "auto") {
    return navAuto(orderOpts.includeEntryStep);
  }
  if (pathMode === "configurations") {
    return navConfigurations();
  }
  return [];
}

/** Linear step order for a path (used for back navigation and step index). */
export function getImageEditorStepOrder(
  pathMode: ImageEditorPathMode,
  orderOpts: ImageEditorStepOrderOptions
): ImageEditorFlowStep[] {
  if (pathMode === "auto") {
    if (orderOpts.includeEntryStep) {
      return ["entry", "autoElement", "upload", "position", "save"];
    }
    return ["autoElement", "upload", "position", "save"];
  }
  if (pathMode === "configurations") {
    return ["entry", "configurePresets"];
  }
  return [];
}

export function imageEditorStepIndex(
  step: ImageEditorFlowStep,
  pathMode: ImageEditorPathMode,
  orderOpts: ImageEditorStepOrderOptions
): number {
  return getImageEditorStepOrder(pathMode, orderOpts).indexOf(step);
}

/** Whether `target` is strictly before the current step (back navigation). */
export function isImageEditorBackStep(
  from: ImageEditorFlowStep,
  to: ImageEditorFlowStep,
  pathMode: ImageEditorPathMode,
  orderOpts: ImageEditorStepOrderOptions
): boolean {
  return (
    imageEditorStepIndex(to, pathMode, orderOpts) < imageEditorStepIndex(from, pathMode, orderOpts) &&
    imageEditorStepIndex(to, pathMode, orderOpts) >= 0
  );
}

type ImageEditorBackNavigationInput = {
  target: ImageEditorFlowStep;
  pathMode: ImageEditorPathMode;
  flowStep: ImageEditorFlowStep;
  imageSrc: string | null;
  isWorkspaceDesigner: boolean;
  clearImageSourceOnly: () => void;
  setPathMode: (mode: ImageEditorPathMode) => void;
  setFlowStep: (step: ImageEditorFlowStep) => void;
};

/** Apply back navigation from the step strip when `target` is before `flowStep`. */
export function applyImageEditorBackNavigation(input: ImageEditorBackNavigationInput): void {
  const { target, pathMode, flowStep, imageSrc, isWorkspaceDesigner, clearImageSourceOnly, setPathMode, setFlowStep } =
    input;
  if (pathMode === "unset") {
    return;
  }
  const order = getImageEditorStepOrder(pathMode, {
    includeEntryStep: imageEditorIncludeEntryInStepOrder(pathMode, isWorkspaceDesigner),
  });
  const ti = order.indexOf(target);
  const fi = order.indexOf(flowStep);
  if (ti === -1 || fi === -1 || ti >= fi) {
    return;
  }
  if (target === "entry") {
    clearImageSourceOnly();
    setPathMode("unset");
    setFlowStep("entry");
    return;
  }
  const clearToStep =
    target === "upload" ||
    (target === "autoElement" && pathMode === "auto") ||
    (target === "configurePresets" && pathMode === "configurations");
  if (clearToStep) {
    clearImageSourceOnly();
    setFlowStep(target);
    return;
  }
  if ((target === "position" || target === "save") && imageSrc) {
    setFlowStep(target);
  }
}

/** `entry` appears in the step strip when designers can return to the start screen. */
export function imageEditorIncludeEntryInStepOrder(
  pathMode: ImageEditorPathMode,
  isWorkspaceDesigner: boolean
): boolean {
  if (pathMode === "configurations") {
    return true;
  }
  if (pathMode === "auto") {
    return isWorkspaceDesigner;
  }
  return false;
}
