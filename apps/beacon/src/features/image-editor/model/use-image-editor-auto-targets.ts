import type { ImageEditorFlowStep } from "@/features/image-editor/lib/image-editor-flow-step";
import { useImagePageTargetDiscovery } from "@/features/image-editor/model/use-image-page-target-discovery";

type UseImageEditorAutoTargetsOptions = {
  flowStep: ImageEditorFlowStep;
  pathMode: "unset" | "auto" | "configurations";
};

export function useImageEditorAutoTargets(options: UseImageEditorAutoTargetsOptions) {
  const { flowStep, pathMode } = options;
  const active = pathMode === "auto" && flowStep === "autoElement";
  return useImagePageTargetDiscovery(active);
}

/** Page scan for the Configuration preset form only (isolated from the main target hook). */
export function usePresetFormTargets(active: boolean) {
  return useImagePageTargetDiscovery(active);
}
