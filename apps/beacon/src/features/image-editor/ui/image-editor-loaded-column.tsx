import type { ReactNode, RefObject } from "react";
import type { ImageEditorFlowStep, ImageEditorPathMode } from "@/features/image-editor/lib/image-editor-flow-step";
import { LoadedImageSourceSection } from "@/features/image-editor/ui/image-editor-source-sections";
import { ImageEditorStepNav } from "@/features/image-editor/ui/image-editor-step-nav";

type ImageEditorLoadedColumnProps = {
  showFlowStepNav: boolean;
  pathMode: ImageEditorPathMode;
  includeEntryStep: boolean;
  currentStepForNav: ImageEditorFlowStep;
  goToStep: (s: ImageEditorFlowStep) => void;
  flowStep: ImageEditorFlowStep;
  fileBaseName: string;
  busy: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  children: ReactNode;
};

export function ImageEditorLoadedColumn(props: ImageEditorLoadedColumnProps) {
  const {
    showFlowStepNav,
    pathMode,
    includeEntryStep,
    currentStepForNav,
    goToStep,
    flowStep,
    fileBaseName,
    busy,
    fileInputRef,
    children,
  } = props;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {showFlowStepNav ? (
        <div className="px-4 pt-1">
          <ImageEditorStepNav
            current={currentStepForNav}
            hasImage
            includeEntryStep={includeEntryStep}
            pathMode={pathMode}
            onGoToStep={goToStep}
          />
        </div>
      ) : null}
      {flowStep === "save" ? (
        <LoadedImageSourceSection busy={busy} fileBaseName={fileBaseName} fileInputRef={fileInputRef} />
      ) : null}
      <div className="flex min-w-0 flex-col gap-3 px-4">{children}</div>
    </div>
  );
}
