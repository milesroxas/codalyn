import { IconRefresh } from "@tabler/icons-react";
import { MousePointerClick } from "lucide-react";

import type {
  PresetFormAddableScope,
  PresetFormExistingMatch,
} from "@/features/image-editor/lib/image-editor-preset-form-existing";
import {
  IMAGE_TARGET_STEP_SCAN_LABEL,
  IMAGE_TARGET_STEP_SCAN_PENDING,
  IMAGE_TARGET_STEP_USE_SELECTION,
} from "@/features/image-editor/lib/image-editor-target-step-copy";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { ImageEditorSelectedSurfacePanel } from "@/features/image-editor/ui/image-editor-selected-surface-panel";
import { Button } from "@/shared/ui/button";

export type ImageEditorTargetStepSurfaceProps = {
  target: ImagePageTarget | null;
  discoveryPending?: boolean;
  existingPresets?: PresetFormExistingMatch[];
  addableScopes?: PresetFormAddableScope[];
  onEditPreset?: (match: PresetFormExistingMatch) => void;
  onAddScope?: (scope: PresetFormAddableScope["scope"]) => void;
};

type ImageEditorTargetStepScanButtonProps = {
  onScanPage: () => void;
  scanPending: boolean;
};

export function ImageEditorTargetStepScanButton(props: ImageEditorTargetStepScanButtonProps) {
  const { onScanPage, scanPending } = props;

  return (
    <Button type="button" variant="actionCard" size="actionCard" disabled={scanPending} onClick={onScanPage}>
      {!scanPending ? <IconRefresh data-icon="inline-start" aria-hidden stroke={1.5} /> : null}
      <span>{scanPending ? IMAGE_TARGET_STEP_SCAN_PENDING : IMAGE_TARGET_STEP_SCAN_LABEL}</span>
    </Button>
  );
}

type ImageEditorTargetStepActionsProps = {
  onScanPage: () => void;
  scanPending: boolean;
  pageScanned: boolean;
  showScanButton?: boolean;
  surface?: ImageEditorTargetStepSurfaceProps;
  /** Upload flow commits canvas selection to advance; preset flow uses live surface panel actions instead. */
  showUseSelection?: boolean;
  hasCanvasImageTarget?: boolean;
  onUseCanvasSelection?: () => void;
};

export function ImageEditorTargetStepActions(props: ImageEditorTargetStepActionsProps) {
  const {
    onScanPage,
    scanPending,
    pageScanned,
    showScanButton = true,
    surface,
    showUseSelection = false,
    hasCanvasImageTarget = false,
    onUseCanvasSelection,
  } = props;
  const showScanAction = showScanButton && !pageScanned && !scanPending;

  return (
    <div className="grid gap-2">
      {surface ? (
        <ImageEditorSelectedSurfacePanel
          addableScopes={surface.addableScopes}
          discoveryPending={surface.discoveryPending}
          existingPresets={surface.existingPresets}
          onAddScope={surface.onAddScope}
          onEditPreset={surface.onEditPreset}
          target={surface.target}
        />
      ) : null}
      {showUseSelection && onUseCanvasSelection ? (
        <Button
          type="button"
          variant="actionCard"
          size="actionCard"
          disabled={!hasCanvasImageTarget}
          onClick={onUseCanvasSelection}
        >
          <MousePointerClick data-icon="inline-start" aria-hidden strokeWidth={2.25} />
          <span>{IMAGE_TARGET_STEP_USE_SELECTION}</span>
        </Button>
      ) : null}
      {showScanAction ? <ImageEditorTargetStepScanButton onScanPage={onScanPage} scanPending={scanPending} /> : null}
    </div>
  );
}
