import { useCallback } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { ImageEditorFlowStep, ImageEditorPathMode } from "@/features/image-editor/lib/image-editor-flow-step";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";

export function useImageEditorExportSuccessNavigation(options: {
  clearExportSuccess: () => void;
  setFlowStep: (step: ImageEditorFlowStep) => void;
  clearImageSourceOnly: () => void;
  pathMode: ImageEditorPathMode;
  autoPageTarget: ImagePageTarget | null;
  navigate: NavigateFunction;
}) {
  const { clearExportSuccess, setFlowStep, clearImageSourceOnly, pathMode, autoPageTarget, navigate } = options;

  const handleUploadAnotherAfterSuccess = useCallback(() => {
    clearExportSuccess();
    clearImageSourceOnly();
    if (pathMode === "auto") {
      setFlowStep(autoPageTarget != null ? "upload" : "autoElement");
      return;
    }
    setFlowStep("upload");
  }, [clearExportSuccess, clearImageSourceOnly, pathMode, autoPageTarget, setFlowStep]);

  const handleSuccessBackHome = useCallback(() => {
    clearExportSuccess();
    navigate("/home");
  }, [clearExportSuccess, navigate]);

  return { handleUploadAnotherAfterSuccess, handleSuccessBackHome };
}
