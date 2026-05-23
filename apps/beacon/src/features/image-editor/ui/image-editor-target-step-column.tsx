import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { ImagePageTargetScanListSection } from "@/features/image-editor/ui/image-editor-page-target-select-list";
import {
  ImageEditorTargetStepActions,
  ImageEditorTargetStepScanButton,
  type ImageEditorTargetStepSurfaceProps,
} from "@/features/image-editor/ui/image-editor-target-step-actions";

export type ImageEditorTargetStepColumnProps = {
  idPrefix: string;
  discoverySettled: boolean;
  targets: ImagePageTarget[];
  scanPending: boolean;
  scanError: string | null;
  pageScanned: boolean;
  onRescan: () => void;
  selectedTarget: ImagePageTarget | null;
  onSelectTarget: (target: ImagePageTarget) => void;
  surface?: ImageEditorTargetStepSurfaceProps;
  /** Inline scan action lives in `ImageEditorTargetStepActions`; trailing renders a dedicated button below the list. */
  scanButtonPlacement?: "inline" | "trailing";
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
    scanError,
    pageScanned,
    onRescan,
    selectedTarget,
    onSelectTarget,
    surface,
    scanButtonPlacement = "inline",
    showUseSelection = false,
    hasCanvasImageTarget = false,
    onUseCanvasSelection,
  } = props;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ImageEditorTargetStepActions
        hasCanvasImageTarget={hasCanvasImageTarget && discoverySettled}
        onScanPage={onRescan}
        onUseCanvasSelection={onUseCanvasSelection}
        pageScanned={pageScanned}
        scanPending={scanPending}
        showScanButton={scanButtonPlacement === "inline"}
        showUseSelection={showUseSelection}
        surface={surface}
      />
      {discoverySettled ? (
        <ImagePageTargetScanListSection
          idPrefix={idPrefix}
          onRescan={onRescan}
          onSelectTarget={onSelectTarget}
          pageScanned={pageScanned}
          scanError={scanError}
          scanPending={scanPending}
          selectedTarget={selectedTarget}
          targets={targets}
        />
      ) : null}
      {scanButtonPlacement === "trailing" ? (
        <ImageEditorTargetStepScanButton onScanPage={onRescan} scanPending={scanPending} />
      ) : null}
    </div>
  );
}
