import type { SetStateAction } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import { type EditorAspectSelection, editorAspectLabel } from "@/features/image-editor/lib/aspect-preset";
import {
  applyImageEditorBackNavigation,
  type ImageEditorFlowStep,
  type ImageEditorPathMode,
} from "@/features/image-editor/lib/image-editor-flow-step";
import { prefersReducedMotion } from "@/features/image-editor/lib/prefers-reduced-motion";

/** Steps that exit via opacity fade before advancing (see `imageEditorStepExitFadeClass`). */
export type ImageEditorStepExitFrom = "autoElement" | "position";

type UseImageEditorWorkflowOptions = {
  imageSrc: string | null;
  dissolving: boolean;
  showGuestOnboarding: boolean;
  setImageSrcInternal: (v: SetStateAction<string | null>) => void;
  setOriginalBytes: (v: SetStateAction<number | null>) => void;
  setCompletedCrop: (v: SetStateAction<Area | null>) => void;
  setCrop: (v: { x: number; y: number }) => void;
  setZoom: (v: number) => void;
  aspectPreset: EditorAspectSelection;
  cropFrameMode: "aspect" | "custom";
  parsedOutputW: number;
  parsedOutputH: number;
  /** Set when the user picked a canvas target in Auto path (for the position step). */
  autoTargetLabel: string | null;
  /** `tag` — data-beacon-export-* on the image; `manual` — user max width + aspect; `null` — no target. */
  autoTargetExportSizeLabel: "tag" | "manual" | null;
  /** `false` until aspect + max width (or custom W×H) are set when not using a tagged size. */
  exportDimensionsReady: boolean;
  isWorkspaceDesigner: boolean;
};

export function useImageEditorWorkflow(options: UseImageEditorWorkflowOptions) {
  const {
    imageSrc,
    dissolving,
    showGuestOnboarding,
    setImageSrcInternal,
    setOriginalBytes,
    setCompletedCrop,
    setCrop,
    setZoom,
    aspectPreset,
    cropFrameMode,
    parsedOutputW,
    parsedOutputH,
    autoTargetLabel,
    autoTargetExportSizeLabel,
    exportDimensionsReady,
    isWorkspaceDesigner,
  } = options;

  const [pathMode, setPathMode] = useState<ImageEditorPathMode>("unset");
  const [flowStep, setFlowStep] = useState<ImageEditorFlowStep>("entry");
  const [stepExitFade, setStepExitFade] = useState(false);
  const [stepExitFrom, setStepExitFrom] = useState<ImageEditorStepExitFrom | null>(null);
  const imageSrcReplaceDetectRef = useRef<string | null>(null);

  const clearImageSourceOnly = useCallback(() => {
    setImageSrcInternal((prev) => {
      if (prev?.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setOriginalBytes(null);
    setCompletedCrop(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, [setImageSrcInternal, setOriginalBytes, setCompletedCrop, setCrop, setZoom]);

  const goToStep = useCallback(
    (target: ImageEditorFlowStep) => {
      applyImageEditorBackNavigation({
        target,
        pathMode,
        flowStep,
        imageSrc,
        isWorkspaceDesigner,
        clearImageSourceOnly,
        setPathMode,
        setFlowStep,
      });
    },
    [flowStep, pathMode, imageSrc, clearImageSourceOnly, isWorkspaceDesigner]
  );

  const chooseAutoPath = useCallback(() => {
    setPathMode("auto");
    setFlowStep("autoElement");
  }, []);

  const chooseConfigurePath = useCallback(() => {
    setPathMode("configurations");
    setFlowStep("configurePresets");
  }, []);

  /** Exit Configuration and return to the designer start screen. */
  const finishConfigurePath = useCallback(() => {
    setPathMode("unset");
    setFlowStep("entry");
  }, []);

  const frameSummary = useMemo(() => {
    if (pathMode === "auto" && autoTargetLabel && autoTargetExportSizeLabel != null) {
      if (autoTargetExportSizeLabel === "manual" && !exportDimensionsReady) {
        return `${autoTargetLabel} — choose an aspect ratio and max export width (or Custom W×H), or tag a designer preset to this image in Beacon, then pan and zoom.`;
      }
      if (autoTargetExportSizeLabel === "tag") {
        return `${autoTargetLabel} · ${parsedOutputW}×${parsedOutputH}px (tagged) — pan and zoom.`;
      }
      return `${autoTargetLabel} · ${parsedOutputW}×${parsedOutputH}px — pan and zoom.`;
    }
    if (cropFrameMode === "aspect") {
      if (aspectPreset === "unset") {
        return "Choose an aspect ratio and max export width (or Custom W×H), then pan and zoom to frame your shot.";
      }
      return `${editorAspectLabel(aspectPreset)} — pan and zoom to frame your shot.`;
    }
    return `${parsedOutputW}×${parsedOutputH}px — pan and zoom to frame your shot.`;
  }, [
    pathMode,
    autoTargetLabel,
    autoTargetExportSizeLabel,
    exportDimensionsReady,
    cropFrameMode,
    aspectPreset,
    parsedOutputW,
    parsedOutputH,
  ]);

  const completeStepExit = useCallback((from: ImageEditorStepExitFrom) => {
    if (from === "autoElement") {
      setFlowStep("upload");
    } else if (from === "position") {
      setFlowStep("save");
    }
    setStepExitFade(false);
    setStepExitFrom(null);
  }, []);

  const onStepExitTransitionEnd = useCallback(() => {
    if (!stepExitFade || stepExitFrom == null) {
      return;
    }
    completeStepExit(stepExitFrom);
  }, [stepExitFade, stepExitFrom, completeStepExit]);

  const beginStepExit = useCallback(
    (from: ImageEditorStepExitFrom) => {
      setStepExitFrom(from);
      if (prefersReducedMotion()) {
        completeStepExit(from);
        return;
      }
      setStepExitFade(true);
    },
    [completeStepExit]
  );

  const beginAutoToUpload = useCallback(() => {
    beginStepExit("autoElement");
  }, [beginStepExit]);

  const beginPositionToSave = useCallback(() => {
    beginStepExit("position");
  }, [beginStepExit]);

  useEffect(() => {
    if (imageSrc && !dissolving && flowStep === "upload") {
      setFlowStep("position");
    }
  }, [imageSrc, dissolving, flowStep]);

  useLayoutEffect(() => {
    if (
      imageSrc &&
      imageSrcReplaceDetectRef.current &&
      imageSrc !== imageSrcReplaceDetectRef.current &&
      flowStep === "save"
    ) {
      setFlowStep("position");
    }
    imageSrcReplaceDetectRef.current = imageSrc;
  }, [imageSrc, flowStep]);

  const currentStepForNav: ImageEditorFlowStep = useMemo(() => {
    if (!imageSrc) {
      return flowStep;
    }
    return flowStep === "save" ? "save" : "position";
  }, [imageSrc, flowStep]);

  const showFlowStepNav = !showGuestOnboarding;

  return {
    pathMode,
    setPathMode,
    flowStep,
    setFlowStep,
    clearImageSourceOnly,
    goToStep,
    chooseAutoPath,
    chooseConfigurePath,
    finishConfigurePath,
    stepExitFade,
    beginAutoToUpload,
    beginPositionToSave,
    onStepExitTransitionEnd,
    frameSummary,
    currentStepForNav,
    showFlowStepNav,
  };
}
