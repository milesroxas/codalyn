import { Loader2 } from "lucide-react";
import type { DragEvent, ReactNode, TransitionEvent } from "react";
import type { ImageEditorFlowStep } from "@/features/image-editor/lib/image-editor-flow-step";
import {
  imageEditorStepEnterTransitionClass,
  imageEditorStepExitTransitionClass,
  isImageEditorStepExitTransitionEnd,
} from "@/features/image-editor/lib/image-editor-step-transition";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { useImageEditorStepEnter } from "@/features/image-editor/model/use-image-editor-step-enter";
import { ImageEditorAutoTargetColumn } from "@/features/image-editor/ui/image-editor-auto-target-column";
import { ImageEditorConfigurationPresetsStep } from "@/features/image-editor/ui/image-editor-configuration-presets-step";
import { ImageEditorEntryColumn } from "@/features/image-editor/ui/image-editor-entry-column";
import { EmptyImageSourceSection } from "@/features/image-editor/ui/image-editor-source-sections";

type ImageEditorPreimageColumnProps = {
  flowStep: ImageEditorFlowStep;
  roleReady: boolean;
  isTowerUser: boolean;
  stepExitFade: boolean;
  onStepExitTransitionEnd: (e: TransitionEvent<HTMLDivElement>) => void;
  isConfirmedGuest: boolean;
  dragActive: boolean;
  fileInputId: string;
  handleDrag: (e: DragEvent) => void;
  handleDragState: (e: DragEvent, active: boolean) => void;
  handleDrop: (e: DragEvent) => void;
  isWorkspaceDesigner: boolean;
  onChooseAddImage: () => void;
  onChooseConfigure: () => void;
  onDoneConfiguringPresets: () => void;
  onConfigurePresetsFooterChange?: (footer: ReactNode | null) => void;
  onConfigurePresetsSubheaderChange?: (subheader: ReactNode | null) => void;
  onConfigurePresetsScrollResetKeyChange?: (key: string | null) => void;
  /** Auto path: element scan */
  autoTargets: ImagePageTarget[];
  autoScanPending: boolean;
  autoScanError: string | null;
  autoPageScanned: boolean;
  onAutoRescan: () => void;
  autoSelectedTarget: ImagePageTarget | null;
  autoDisplaySurfaceTarget: ImagePageTarget | null;
  onAutoSelectTarget: (t: ImagePageTarget) => void;
  hasCanvasImageTarget: boolean;
  autoDiscoverySettled: boolean;
  onAutoUseCanvasSelection: () => void;
};

export function ImageEditorPreimageColumn(props: ImageEditorPreimageColumnProps) {
  const {
    flowStep,
    roleReady,
    isTowerUser,
    stepExitFade,
    onStepExitTransitionEnd,
    isConfirmedGuest,
    dragActive,
    fileInputId,
    handleDrag,
    handleDragState,
    handleDrop,
    isWorkspaceDesigner,
    onChooseAddImage,
    onChooseConfigure,
    onDoneConfiguringPresets,
    onConfigurePresetsFooterChange,
    onConfigurePresetsSubheaderChange,
    onConfigurePresetsScrollResetKeyChange,
    autoTargets,
    autoScanPending,
    autoScanError,
    autoPageScanned,
    onAutoRescan,
    autoSelectedTarget,
    autoDisplaySurfaceTarget,
    onAutoSelectTarget,
    hasCanvasImageTarget,
    autoDiscoverySettled,
    onAutoUseCanvasSelection,
  } = props;

  const showDesignerStart = roleReady && isWorkspaceDesigner && flowStep === "entry";
  const entered = useImageEditorStepEnter(flowStep);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {!roleReady && isTowerUser ? (
        <p className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-xs" role="status">
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : null}
      {showDesignerStart ? (
        <ImageEditorEntryColumn onChooseAddImage={onChooseAddImage} onChooseConfiguration={onChooseConfigure} />
      ) : null}

      {flowStep === "configurePresets" ? (
        <ImageEditorConfigurationPresetsStep
          isGuest={isConfirmedGuest}
          onDone={onDoneConfiguringPresets}
          onFooterChange={onConfigurePresetsFooterChange}
          onSubheaderChange={onConfigurePresetsSubheaderChange}
          onScrollResetKeyChange={onConfigurePresetsScrollResetKeyChange}
        />
      ) : null}

      {flowStep === "autoElement" ? (
        <div
          className={imageEditorStepExitTransitionClass(stepExitFade)}
          onTransitionEnd={(e) => {
            if (isImageEditorStepExitTransitionEnd(e, stepExitFade)) {
              onStepExitTransitionEnd(e);
            }
          }}
        >
          <ImageEditorAutoTargetColumn
            discoverySettled={autoDiscoverySettled}
            hasCanvasImageTarget={hasCanvasImageTarget}
            onRescan={onAutoRescan}
            onSelectTarget={onAutoSelectTarget}
            onUseCanvasSelection={onAutoUseCanvasSelection}
            pageScanned={autoPageScanned}
            scanError={autoScanError}
            scanPending={autoScanPending}
            selectedTarget={autoSelectedTarget}
            displaySurfaceTarget={autoDisplaySurfaceTarget}
            targets={autoTargets}
          />
        </div>
      ) : null}

      {flowStep === "upload" ? (
        <div className={imageEditorStepEnterTransitionClass(entered)}>
          <EmptyImageSourceSection
            dragActive={dragActive}
            fileInputId={fileInputId}
            handleDrag={handleDrag}
            handleDragState={handleDragState}
            handleDrop={handleDrop}
          />
        </div>
      ) : null}
    </div>
  );
}
