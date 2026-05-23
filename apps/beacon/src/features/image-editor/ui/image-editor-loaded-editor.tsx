import type { TransitionEvent } from "react";
import type { ImageExportSuccessContext } from "@/features/image-editor/lib/apply-cropped-export";
import type { ImageEditorFlowStep } from "@/features/image-editor/lib/image-editor-flow-step";
import type { ImageEditorCropExportPanelProps } from "@/features/image-editor/ui/image-editor-crop-export-panel";
import { ImageEditorCropExportPanel } from "@/features/image-editor/ui/image-editor-crop-export-panel";
import { ImageEditorLoadedColumn } from "@/features/image-editor/ui/image-editor-loaded-column";
import { ImageEditorSuccessStep } from "@/features/image-editor/ui/image-editor-success-step";

export type ImageEditorLoadedEditorProps = {
  imageSrc: string | null;
  flowStep: ImageEditorFlowStep;
  exportSuccess: ImageExportSuccessContext | null;
  cmsCollectionTemplatePage: boolean;
  stepExitFade: boolean;
  onStepExitTransitionEnd: (e: TransitionEvent<HTMLDivElement>) => void;
  onUploadAnother: () => void;
  onBackHome: () => void;
  cropPanelProps: ImageEditorCropExportPanelProps;
};

export function ImageEditorLoadedEditor(props: ImageEditorLoadedEditorProps) {
  const {
    imageSrc,
    flowStep,
    exportSuccess,
    cmsCollectionTemplatePage,
    stepExitFade,
    onStepExitTransitionEnd,
    onUploadAnother,
    onBackHome,
    cropPanelProps,
  } = props;

  if (imageSrc == null) {
    return null;
  }

  if (flowStep === "success" && exportSuccess != null) {
    return (
      <ImageEditorSuccessStep
        message={exportSuccess.message}
        showCmsDesignerRefreshHint={exportSuccess.cmsFieldUpdated && cmsCollectionTemplatePage}
        onUploadAnother={onUploadAnother}
        onBackHome={onBackHome}
      />
    );
  }

  return (
    <ImageEditorLoadedColumn
      flowStep={flowStep}
      stepExitFade={stepExitFade}
      onStepExitTransitionEnd={onStepExitTransitionEnd}
    >
      <ImageEditorCropExportPanel {...cropPanelProps} />
    </ImageEditorLoadedColumn>
  );
}
