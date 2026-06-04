/**
 * - `entry` — designer-only: Add image vs Configuration
 * - `autoElement` — pick an Image / component field on the page
 * - `configurePresets` — export presets and surface tags (designers)
 * - `upload` | `position` | `save` — add file, frame, place
 */
export type ImageEditorPathMode = "unset" | "auto" | "configurations";

export type ImageEditorFlowStep =
  | "entry"
  | "autoElement"
  | "configurePresets"
  | "upload"
  | "position"
  | "save"
  | "success";

export type ImageEditorStepOrderOptions = {
  /** When true, `entry` (designer start) is part of the linear order for this path. */
  includeEntryStep: boolean;
};

type NavItem = { id: ImageEditorFlowStep; label: string };

function navAuto(): NavItem[] {
  return [
    { id: "autoElement", label: "Target" },
    { id: "upload", label: "Add" },
    { id: "position", label: "Position" },
    { id: "save", label: "Save" },
  ];
}

function navConfigurations(): NavItem[] {
  return [{ id: "configurePresets", label: "Presets" }];
}

export function getImageEditorNavSteps(pathMode: ImageEditorPathMode): NavItem[] {
  if (pathMode === "unset") {
    return [];
  }
  if (pathMode === "auto") {
    return navAuto();
  }
  if (pathMode === "configurations") {
    return navConfigurations();
  }
  return [];
}

export function shouldShowImageEditorStepNav(pathMode: ImageEditorPathMode): boolean {
  return getImageEditorNavSteps(pathMode).length > 0;
}

const IMAGE_EDITOR_STEP_RESTART_HINT = "Restarts this step — you will add your image file again.";

export function imageEditorStepRestartHint(stepId: ImageEditorFlowStep, hasImage: boolean): string | undefined {
  if (!hasImage) {
    return undefined;
  }
  if (stepId === "autoElement" || stepId === "configurePresets") {
    return IMAGE_EDITOR_STEP_RESTART_HINT;
  }
  return undefined;
}

/** Linear step order for a path (used for back navigation and step index). */
function getImageEditorStepOrder(
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
function imageEditorIncludeEntryInStepOrder(pathMode: ImageEditorPathMode, isWorkspaceDesigner: boolean): boolean {
  if (pathMode === "configurations") {
    return true;
  }
  if (pathMode === "auto") {
    return isWorkspaceDesigner;
  }
  return false;
}
