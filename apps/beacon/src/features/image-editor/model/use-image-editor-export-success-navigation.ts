import { useCallback } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { ImageEditorFlowStep } from "@/features/image-editor/lib/image-editor-flow-step";

export function useImageEditorExportSuccessNavigation(options: {
  clearExportSuccess: () => void;
  setFlowStep: (step: ImageEditorFlowStep) => void;
  clearImageSourceOnly: () => void;
  resetAutoTargetSelection: () => void;
  navigate: NavigateFunction;
}) {
  const { clearExportSuccess, setFlowStep, clearImageSourceOnly, resetAutoTargetSelection, navigate } = options;

  const handleUploadAnotherAfterSuccess = useCallback(() => {
    clearExportSuccess();
    clearImageSourceOnly();
    setFlowStep("upload");
  }, [clearExportSuccess, clearImageSourceOnly, setFlowStep]);

  const handleReselectTargetAfterSuccess = useCallback(() => {
    clearExportSuccess();
    clearImageSourceOnly();
    resetAutoTargetSelection();
    setFlowStep("autoElement");
  }, [clearExportSuccess, clearImageSourceOnly, resetAutoTargetSelection, setFlowStep]);

  const handleSuccessBackHome = useCallback(() => {
    clearExportSuccess();
    navigate("/home");
  }, [clearExportSuccess, navigate]);

  return { handleUploadAnotherAfterSuccess, handleReselectTargetAfterSuccess, handleSuccessBackHome };
}
