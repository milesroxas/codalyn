import { MousePointerClick } from "lucide-react";

import { IMAGE_TARGET_STEP_USE_SELECTION } from "@/features/image-editor/lib/image-editor-target-step-copy";
import type {
  ImagePageTarget,
  ImagePageTargetScanProgress,
} from "@/features/image-editor/lib/scan-image-targets-on-page";
import {
  type ImageEditorTargetStepSurfaceProps,
  ImagePageTargetScanSheet,
} from "@/features/image-editor/ui/image-editor-page-target-scan-sheet";
import { Button } from "@/shared/ui/button";

export type ImageEditorTargetStepColumnProps = {
  idPrefix: string;
  discoverySettled: boolean;
  targets: ImagePageTarget[];
  scanPending: boolean;
  scanProgress: ImagePageTargetScanProgress | null;
  scanError: string | null;
  pageScanned: boolean;
  onRescan: () => void;
  selectedTarget: ImagePageTarget | null;
  onSelectTarget: (target: ImagePageTarget) => void;
  surface?: ImageEditorTargetStepSurfaceProps;
  showUseSelection?: boolean;
  hasCanvasImageTarget?: boolean;
  onUseCanvasSelection?: () => void;
};

export function ImageEditorTargetStepColumn(props: ImageEditorTargetStepColumnProps) {
  const {
    idPrefix,
    discoverySettled,
    targets,
    scanPending,
    scanProgress,
    scanError,
    pageScanned,
    onRescan,
    selectedTarget,
    onSelectTarget,
    surface,
    showUseSelection = false,
    hasCanvasImageTarget = false,
    onUseCanvasSelection,
  } = props;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ImagePageTargetScanSheet
        idPrefix={idPrefix}
        onScan={onRescan}
        onSelectTarget={onSelectTarget}
        pageScanned={pageScanned}
        scanError={scanError}
        scanPending={scanPending}
        scanProgress={scanProgress}
        selectedTarget={selectedTarget}
        surface={surface}
        targets={targets}
      />
      {showUseSelection && onUseCanvasSelection ? (
        <Button
          type="button"
          variant="actionCard"
          size="actionCard"
          disabled={!(hasCanvasImageTarget && discoverySettled)}
          onClick={onUseCanvasSelection}
        >
          <MousePointerClick data-icon="inline-start" aria-hidden strokeWidth={2.25} />
          <span>{IMAGE_TARGET_STEP_USE_SELECTION}</span>
        </Button>
      ) : null}
    </div>
  );
}
