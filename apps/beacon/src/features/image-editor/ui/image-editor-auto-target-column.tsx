import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { ImagePageTargetScanListSection } from "@/features/image-editor/ui/image-editor-page-target-select-list";
import { ImageEditorTargetStepActions } from "@/features/image-editor/ui/image-editor-target-step-actions";

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
    <div className="flex min-w-0 flex-col gap-4">
      <ImageEditorTargetStepActions
        hasCanvasImageTarget={hasCanvasImageTarget && discoverySettled}
        onScanPage={onRescan}
        onUseCanvasSelection={onUseCanvasSelection}
        pageScanned={pageScanned}
        scanPending={scanPending}
        showUseSelection
        surface={{
          discoveryPending: !discoverySettled,
          target: displaySurfaceTarget,
        }}
      />
      {discoverySettled ? (
        <ImagePageTargetScanListSection
          idPrefix="auto-tgt"
          onRescan={onRescan}
          onSelectTarget={onSelectTarget}
          pageScanned={pageScanned}
          scanError={scanError}
          scanPending={scanPending}
          selectedTarget={selectedTarget}
          targets={targets}
        />
      ) : null}
    </div>
  );
}
