import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { useMemo } from "react";
import { imagePageTargetTablerIcon } from "@/features/image-editor/lib/image-editor-page-target-icon";
import {
  IMAGE_PAGE_TARGET_SCAN_PROGRESS_DELAY_MS,
  resolveImagePageTargetScanLoadingProgress,
} from "@/features/image-editor/lib/image-editor-target-scan-progress";
import {
  IMAGE_TARGET_STEP_EMPTY,
  IMAGE_TARGET_STEP_ON_PAGE,
  IMAGE_TARGET_STEP_RESCAN_LABEL,
  IMAGE_TARGET_STEP_SCAN_PENDING,
} from "@/features/image-editor/lib/image-editor-target-step-copy";
import {
  formatImagePageTargetKindLabel,
  formatImagePageTargetPrimaryLabel,
} from "@/features/image-editor/lib/image-editor-target-surface-label";
import type {
  ImagePageTarget,
  ImagePageTargetScanProgress,
} from "@/features/image-editor/lib/scan-image-targets-on-page";
import { Button } from "@/shared/ui/button";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import {
  SurfaceSummaryCardIconBox,
  SurfaceSummaryCardIconRowCopy,
  SurfaceSummaryCardMeta,
  SurfaceSummaryCardScanListError,
  SurfaceSummaryCardScanListScrollBody,
  SurfaceSummaryCardScanListScrollTitle,
  SurfaceSummaryCardScanListScrollToolbar,
  SurfaceSummaryCardScanListSection,
  SurfaceSummaryCardSelectRow,
  SurfaceSummaryCardSelectRowControl,
  SurfaceSummaryCardSelectRowList,
  SurfaceSummaryCardTitle,
} from "@/shared/ui/surface-summary-card";

type ImagePageTargetSelectListProps = {
  idPrefix: string;
  targets: ImagePageTarget[];
  selectedTarget: ImagePageTarget | null;
  onSelectTarget: (target: ImagePageTarget) => void;
};

function ImagePageTargetSelectList(props: ImagePageTargetSelectListProps) {
  const { idPrefix, targets, selectedTarget, onSelectTarget } = props;

  return (
    <RadioGroup
      className="grid min-w-0 gap-0"
      value={selectedTarget?.id ?? ""}
      onValueChange={(id) => {
        const target = targets.find((entry) => entry.id === id);
        if (target) {
          onSelectTarget(target);
        }
      }}
    >
      <SurfaceSummaryCardSelectRowList density="compact">
        {targets.map((target) => {
          const inputId = `${idPrefix}-${target.id}`;
          const TargetIcon = imagePageTargetTablerIcon(target.kind);
          const selected = selectedTarget?.id === target.id;

          return (
            <SurfaceSummaryCardSelectRow key={target.id} density="compact" htmlFor={inputId} selected={selected}>
              <SurfaceSummaryCardIconBox density="compact">
                <TargetIcon aria-hidden stroke={1.5} />
              </SurfaceSummaryCardIconBox>
              <SurfaceSummaryCardIconRowCopy>
                <SurfaceSummaryCardTitle density="compact">
                  {formatImagePageTargetPrimaryLabel(target)}
                </SurfaceSummaryCardTitle>
                <SurfaceSummaryCardMeta>{formatImagePageTargetKindLabel(target)}</SurfaceSummaryCardMeta>
              </SurfaceSummaryCardIconRowCopy>
              <SurfaceSummaryCardSelectRowControl>
                <RadioGroupItem id={inputId} value={target.id} />
              </SurfaceSummaryCardSelectRowControl>
            </SurfaceSummaryCardSelectRow>
          );
        })}
      </SurfaceSummaryCardSelectRowList>
    </RadioGroup>
  );
}

type ImagePageTargetScanListSectionProps = {
  idPrefix: string;
  targets: ImagePageTarget[];
  scanPending: boolean;
  scanProgress: ImagePageTargetScanProgress | null;
  scanError: string | null;
  pageScanned: boolean;
  onRescan: () => void;
  selectedTarget: ImagePageTarget | null;
  onSelectTarget: (target: ImagePageTarget) => void;
};

function ImagePageTargetScanListToolbar(props: { scanPending: boolean; onRescan: () => void }) {
  const { scanPending, onRescan } = props;

  return (
    <SurfaceSummaryCardScanListScrollToolbar>
      <SurfaceSummaryCardScanListScrollTitle>{IMAGE_TARGET_STEP_ON_PAGE}</SurfaceSummaryCardScanListScrollTitle>
      <Button type="button" size="sm" variant="outline" disabled={scanPending} onClick={onRescan}>
        <span>{IMAGE_TARGET_STEP_RESCAN_LABEL}</span>
      </Button>
    </SurfaceSummaryCardScanListScrollToolbar>
  );
}

function ImagePageTargetScanListScrollPanel(
  props: Pick<
    ImagePageTargetScanListSectionProps,
    | "idPrefix"
    | "targets"
    | "scanPending"
    | "scanProgress"
    | "scanError"
    | "pageScanned"
    | "onRescan"
    | "selectedTarget"
    | "onSelectTarget"
  >
) {
  const {
    idPrefix,
    targets,
    scanPending,
    scanProgress,
    scanError,
    pageScanned,
    onRescan,
    selectedTarget,
    onSelectTarget,
  } = props;
  const hasListRows = targets.length > 0;
  const showScanLoading = useDeferredLoadingIndicator(scanPending && targets.length === 0);
  const showInlineScanLoading = useDeferredLoadingIndicator(scanPending && targets.length > 0);
  const showScanProgressBar = useDeferredLoadingIndicator(scanPending, IMAGE_PAGE_TARGET_SCAN_PROGRESS_DELAY_MS);
  const loadingProgress = useMemo(
    () => resolveImagePageTargetScanLoadingProgress(scanProgress, showScanProgressBar),
    [scanProgress, showScanProgressBar]
  );
  const isEmpty = pageScanned && targets.length === 0 && !scanPending;
  const showToolbar = pageScanned && (hasListRows || scanPending);

  return (
    <>
      {scanError ? <SurfaceSummaryCardScanListError>{scanError}</SurfaceSummaryCardScanListError> : null}
      <SurfaceSummaryCardScanListScrollBody
        data-slot="image_editor_page_target_scan_list"
        inlineLoading={showInlineScanLoading && !showScanProgressBar}
        inlineLoadingAriaLabel={IMAGE_TARGET_STEP_SCAN_PENDING}
        loading={showScanLoading}
        loadingAriaLabel={IMAGE_TARGET_STEP_SCAN_PENDING}
        loadingProgress={loadingProgress}
        isEmpty={isEmpty}
        emptyMessage={IMAGE_TARGET_STEP_EMPTY}
        toolbar={showToolbar ? <ImagePageTargetScanListToolbar onRescan={onRescan} scanPending={scanPending} /> : null}
      >
        {hasListRows ? (
          <ImagePageTargetSelectList
            idPrefix={idPrefix}
            onSelectTarget={onSelectTarget}
            selectedTarget={selectedTarget}
            targets={targets}
          />
        ) : null}
      </SurfaceSummaryCardScanListScrollBody>
    </>
  );
}

export function ImagePageTargetScanListSection(props: ImagePageTargetScanListSectionProps) {
  const {
    idPrefix,
    targets,
    scanPending,
    scanProgress,
    scanError,
    pageScanned,
    onRescan,
    selectedTarget,
    onSelectTarget,
  } = props;
  const showScrollBody = pageScanned || scanPending;

  if (!pageScanned && !scanPending && !scanError) {
    return null;
  }

  return (
    <SurfaceSummaryCardScanListSection>
      {showScrollBody ? (
        <ImagePageTargetScanListScrollPanel
          idPrefix={idPrefix}
          onRescan={onRescan}
          onSelectTarget={onSelectTarget}
          pageScanned={pageScanned}
          scanError={scanError}
          scanPending={scanPending}
          scanProgress={scanProgress}
          selectedTarget={selectedTarget}
          targets={targets}
        />
      ) : scanError ? (
        <SurfaceSummaryCardScanListError>{scanError}</SurfaceSummaryCardScanListError>
      ) : null}
    </SurfaceSummaryCardScanListSection>
  );
}
