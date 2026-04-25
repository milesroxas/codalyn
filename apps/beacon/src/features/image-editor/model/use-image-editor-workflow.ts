import type { SetStateAction, TransitionEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import type { AspectPreset } from "@/features/image-editor/lib/aspect-preset";
import { aspectLabels } from "@/features/image-editor/lib/aspect-preset";
import {
  getImageEditorStepOrder,
  type ImageEditorFlowStep,
  type ImageEditorPathMode,
  imageEditorIncludeEntryInStepOrder,
} from "@/features/image-editor/lib/image-editor-flow-step";
import type { ExportDimensionInferenceSource } from "@/features/image-editor/lib/infer-export-dimensions-compute";

type UseImageEditorWorkflowOptions = {
  imageSrc: string | null;
  dissolving: boolean;
  showGuestOnboarding: boolean;
  setImageSrcInternal: (v: SetStateAction<string | null>) => void;
  setOriginalBytes: (v: SetStateAction<number | null>) => void;
  setCompletedCrop: (v: SetStateAction<Area | null>) => void;
  setCrop: (v: { x: number; y: number }) => void;
  setZoom: (v: number) => void;
  aspectPreset: AspectPreset;
  cropFrameMode: "aspect" | "custom";
  parsedOutputW: number;
  parsedOutputH: number;
  /** Set when the user picked a canvas target in Auto path (for the position step). */
  autoTargetLabel: string | null;
  /** How export W×H was chosen from the canvas target (tagged size vs layout inference). */
  autoExportInferenceSource: ExportDimensionInferenceSource | null;
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
    autoExportInferenceSource,
    isWorkspaceDesigner,
  } = options;

  const [pathMode, setPathMode] = useState<ImageEditorPathMode>("unset");
  const [flowStep, setFlowStep] = useState<ImageEditorFlowStep>("entry");
  const [exitToUploadFade, setExitToUploadFade] = useState(false);
  const [exitToUploadFrom, setExitToUploadFrom] = useState<"autoElement" | null>(null);
  const imageSrcReplaceDetectRef = useRef<string | null>(null);

  const includeEntryStep = useMemo(
    () => imageEditorIncludeEntryInStepOrder(pathMode, isWorkspaceDesigner),
    [pathMode, isWorkspaceDesigner]
  );

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
      if (target === "position" && imageSrc) {
        setFlowStep("position");
      }
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
    if (pathMode === "auto" && autoTargetLabel) {
      const from = autoExportInferenceSource === "designer-tag" ? "tagged size" : "layout";
      return `${autoTargetLabel} · ${parsedOutputW}×${parsedOutputH}px (${from}) — pan and zoom.`;
    }
    if (cropFrameMode === "aspect") {
      return `${aspectLabels[aspectPreset]} — pan and zoom to frame your shot.`;
    }
    return `${parsedOutputW}×${parsedOutputH}px — pan and zoom to frame your shot.`;
  }, [pathMode, autoTargetLabel, cropFrameMode, aspectPreset, parsedOutputW, parsedOutputH, autoExportInferenceSource]);

  const onExitToUploadTransitionEnd = useCallback(
    (e: TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget || e.propertyName !== "opacity" || !exitToUploadFade) {
        return;
      }
      if (exitToUploadFrom === "autoElement") {
        setFlowStep("upload");
        setExitToUploadFade(false);
        setExitToUploadFrom(null);
      }
    },
    [exitToUploadFade, exitToUploadFrom]
  );

  const beginAutoToUpload = useCallback(() => {
    setExitToUploadFrom("autoElement");
    setExitToUploadFade(true);
  }, []);

  useEffect(() => {
    if (pathMode === "auto" && flowStep === "save") {
      setFlowStep("position");
    }
  }, [pathMode, flowStep]);

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
    includeEntryStep,
    chooseAutoPath,
    chooseConfigurePath,
    finishConfigurePath,
    exitToUploadFade,
    beginAutoToUpload,
    onExitToUploadTransitionEnd,
    frameSummary,
    currentStepForNav,
    showFlowStepNav,
  };
}
