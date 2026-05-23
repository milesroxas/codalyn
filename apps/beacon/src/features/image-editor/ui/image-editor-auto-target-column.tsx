import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { ImageEditorTargetStepColumn } from "@/features/image-editor/ui/image-editor-target-step-column";

type ImageEditorAutoTargetColumnProps = {
  discoverySettled: boolean;
  hasCanvasImageTarget: boolean;
  targets: ImagePageTarget[];
  scanPending: boolean;
  scanError: string | null;
  pageScanned: boolean;
  onRescan: () => void;
  onUseCanvasSelection: () => void;
  selectedTarget: ImagePageTarget | null;
  displaySurfaceTarget: ImagePageTarget | null;
  onSelectTarget: (t: ImagePageTarget) => void;
};

export function ImageEditorAutoTargetColumn(props: ImageEditorAutoTargetColumnProps) {
  const {
    discoverySettled,
    hasCanvasImageTarget,
    targets,
    scanPending,
    scanError,
    pageScanned,
    onRescan,
    onUseCanvasSelection,
    selectedTarget,
    displaySurfaceTarget,
    onSelectTarget,
  } = props;

  return (
    <ImageEditorTargetStepColumn
      discoverySettled={discoverySettled}
      hasCanvasImageTarget={hasCanvasImageTarget}
      idPrefix="auto-tgt"
      onRescan={onRescan}
      onSelectTarget={onSelectTarget}
      onUseCanvasSelection={onUseCanvasSelection}
      pageScanned={pageScanned}
      scanError={scanError}
      scanPending={scanPending}
      selectedTarget={selectedTarget}
      showUseSelection
      surface={{
        discoveryPending: !discoverySettled,
        target: displaySurfaceTarget,
      }}
      targets={targets}
    />
  );
}
