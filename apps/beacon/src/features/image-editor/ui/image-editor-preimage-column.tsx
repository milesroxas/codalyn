import { Loader2 } from "lucide-react";
import type { DragEvent, TransitionEvent } from "react";
import type { ImageEditorFlowStep, ImageEditorPathMode } from "@/features/image-editor/lib/image-editor-flow-step";
import type { ImagePageTarget, SelectedImageTargetHint } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { ImageEditorAutoTargetColumn } from "@/features/image-editor/ui/image-editor-auto-target-column";
import { ImageEditorConfigurationPresetsStep } from "@/features/image-editor/ui/image-editor-configuration-presets-step";
import { ImageEditorEntryColumn } from "@/features/image-editor/ui/image-editor-entry-column";
import { EmptyImageSourceSection } from "@/features/image-editor/ui/image-editor-source-sections";
import { ImageEditorStepNav } from "@/features/image-editor/ui/image-editor-step-nav";
import { cn } from "@/shared/lib/utils";

type ImageEditorPreimageColumnProps = {
  pathMode: ImageEditorPathMode;
  flowStep: ImageEditorFlowStep;
  goToStep: (s: ImageEditorFlowStep) => void;
  includeEntryStep: boolean;
  roleReady: boolean;
  isTowerUser: boolean;
  exitToUploadFade: boolean;
  onExitToUploadTransitionEnd: (e: TransitionEvent<HTMLDivElement>) => void;
  isConfirmedGuest: boolean;
  beginAutoToUpload: () => void;
  dropZoneLabelClass: string;
  fileInputId: string;
  handleDrag: (e: DragEvent) => void;
  handleDragState: (e: DragEvent, active: boolean) => void;
  handleDrop: (e: DragEvent) => void;
  isWorkspaceDesigner: boolean;
  onChooseAddImage: () => void;
  onChooseConfigure: () => void;
  onDoneConfiguringPresets: () => void;
  currentStepForNav: ImageEditorFlowStep;
  /** Auto path: element scan */
  autoTargets: ImagePageTarget[];
  autoScanPending: boolean;
  autoScanError: string | null;
  onAutoRescan: () => void;
  autoSelectionHint: SelectedImageTargetHint;
  autoSelectedTarget: ImagePageTarget | null;
  onAutoSelectTarget: (t: ImagePageTarget) => void;
  onAutoUseCanvasSelection: () => void;
  onAutoChooseAnotherOnPage: () => void;
  autoShowSelectionChoice: boolean;
  autoDiscoverySettled: boolean;
  autoShowPageTargetList: boolean;
};

export function ImageEditorPreimageColumn(props: ImageEditorPreimageColumnProps) {
  const {
    pathMode,
    flowStep,
    goToStep,
    includeEntryStep,
    roleReady,
    isTowerUser,
    exitToUploadFade,
    onExitToUploadTransitionEnd,
    isConfirmedGuest,
    beginAutoToUpload,
    dropZoneLabelClass,
    fileInputId,
    handleDrag,
    handleDragState,
    handleDrop,
    isWorkspaceDesigner,
    onChooseAddImage,
    onChooseConfigure,
    onDoneConfiguringPresets,
    currentStepForNav,
    autoTargets,
    autoScanPending,
    autoScanError,
    onAutoRescan,
    autoSelectionHint,
    autoSelectedTarget,
    onAutoSelectTarget,
    onAutoUseCanvasSelection,
    onAutoChooseAnotherOnPage,
    autoShowSelectionChoice,
    autoDiscoverySettled,
    autoShowPageTargetList,
  } = props;

  const showDesignerStart = roleReady && isWorkspaceDesigner && flowStep === "entry";

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3 overflow-hidden">
      <ImageEditorStepNav
        className="shrink-0 px-1"
        current={currentStepForNav}
        hasImage={false}
        includeEntryStep={includeEntryStep}
        pathMode={pathMode}
        onGoToStep={goToStep}
      />

      <div className="min-h-0 w-full min-w-0 flex-1 flex flex-col overflow-hidden">
        {!roleReady && isTowerUser ? (
          <p className="text-muted-foreground flex flex-1 items-center justify-center gap-2 px-1 text-xs" role="status">
            <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
            Loading…
          </p>
        ) : null}
        {showDesignerStart ? (
          <ImageEditorEntryColumn onChooseAddImage={onChooseAddImage} onChooseConfiguration={onChooseConfigure} />
        ) : null}

        {flowStep === "configurePresets" ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-1">
            <ImageEditorConfigurationPresetsStep isGuest={isConfirmedGuest} onDone={onDoneConfiguringPresets} />
          </div>
        ) : null}

        {flowStep === "autoElement" ? (
          <div
            className={cn(
              "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden transition-opacity duration-300 ease-out",
              exitToUploadFade && "pointer-events-none opacity-0"
            )}
            onTransitionEnd={onExitToUploadTransitionEnd}
          >
            <ImageEditorAutoTargetColumn
              discoverySettled={autoDiscoverySettled}
              onChooseAnotherOnPage={onAutoChooseAnotherOnPage}
              onContinue={beginAutoToUpload}
              onRescan={onAutoRescan}
              onSelectTarget={onAutoSelectTarget}
              onUseCanvasSelection={onAutoUseCanvasSelection}
              scanError={autoScanError}
              scanPending={autoScanPending}
              selectedTarget={autoSelectedTarget}
              selectionHint={autoSelectionHint}
              showPageTargetList={autoShowPageTargetList}
              showSelectionChoice={autoShowSelectionChoice}
              targets={autoTargets}
            />
          </div>
        ) : null}

        {flowStep === "upload" ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
            <div className="min-h-0 min-w-0 flex-1">
              <EmptyImageSourceSection
                dropZoneLabelClass={dropZoneLabelClass}
                fileInputId={fileInputId}
                handleDrag={handleDrag}
                handleDragState={handleDragState}
                handleDrop={handleDrop}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
