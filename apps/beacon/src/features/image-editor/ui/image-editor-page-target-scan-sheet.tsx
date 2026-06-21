import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { IconRefresh } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type {
  PresetFormAddableScope,
  PresetFormExistingMatch,
} from "@/features/image-editor/lib/image-editor-preset-form-existing";
import {
  IMAGE_PAGE_TARGET_SCAN_PROGRESS_DELAY_MS,
  type ImageEditorTargetScanProgressView,
  resolveImagePageTargetScanLoadingProgress,
} from "@/features/image-editor/lib/image-editor-target-scan-progress";
import {
  IMAGE_TARGET_STEP_EMPTY,
  IMAGE_TARGET_STEP_ON_PAGE,
  IMAGE_TARGET_STEP_RESCAN_LABEL,
  IMAGE_TARGET_STEP_SCAN_LABEL,
  IMAGE_TARGET_STEP_SCAN_PENDING,
  IMAGE_TARGET_STEP_SELECT_LABEL,
  IMAGE_TARGET_STEP_SHEET_DESCRIPTION,
  IMAGE_TARGET_STEP_SHEET_LIST_LABEL,
} from "@/features/image-editor/lib/image-editor-target-step-copy";
import type {
  ImagePageTarget,
  ImagePageTargetScanProgress,
} from "@/features/image-editor/lib/scan-image-targets-on-page";
import { ImagePageTargetSelectList } from "@/features/image-editor/ui/image-editor-page-target-select-list";
import { ImageEditorSelectedSurfacePanel } from "@/features/image-editor/ui/image-editor-selected-surface-panel";
import { Button } from "@/shared/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  drawerListSheetContentDefaults,
} from "@/shared/ui/drawer";
import { DrawerScrollList } from "@/shared/ui/drawer-scroll-list";
import { Progress } from "@/shared/ui/progress";

/** Selected-surface card descriptor passed through to the panel rendered inside the sheet. */
export type ImageEditorTargetStepSurfaceProps = {
  target: ImagePageTarget | null;
  discoveryPending?: boolean;
  existingPresets?: PresetFormExistingMatch[];
  addableScopes?: PresetFormAddableScope[];
  onEditPreset?: (match: PresetFormExistingMatch) => void;
  onAddScope?: (scope: PresetFormAddableScope["scope"]) => void;
};

function ImagePageTargetScanProgressBar(props: { progress: ImageEditorTargetScanProgressView }) {
  const { value, indeterminate, label, detail } = props.progress;
  const ariaValueText = detail.length > 0 ? `${label} ${detail}` : label;
  const showIndeterminate = indeterminate || value == null;

  return (
    <div
      className="flex w-full min-w-0 max-w-xs flex-col gap-1.5"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={showIndeterminate ? undefined : (value ?? undefined)}
      aria-valuetext={ariaValueText}
      aria-label={label}
      aria-busy={showIndeterminate}
    >
      <p className="text-sm font-medium leading-none">{label}</p>
      {detail ? <p className="text-muted-foreground text-xs leading-snug tabular-nums">{detail}</p> : null}
      {showIndeterminate ? <Progress indeterminate /> : <Progress value={value ?? 0} />}
    </div>
  );
}

export type ImagePageTargetScanSheetProps = {
  idPrefix: string;
  targets: ImagePageTarget[];
  scanPending: boolean;
  scanProgress: ImagePageTargetScanProgress | null;
  scanError: string | null;
  pageScanned: boolean;
  selectedTarget: ImagePageTarget | null;
  onSelectTarget: (target: ImagePageTarget) => void;
  onScan: () => void;
  surface?: ImageEditorTargetStepSurfaceProps;
};

export function ImagePageTargetScanSheet(props: ImagePageTargetScanSheetProps) {
  const {
    idPrefix,
    targets,
    scanPending,
    scanProgress,
    scanError,
    pageScanned,
    selectedTarget,
    onSelectTarget,
    onScan,
    surface,
  } = props;

  const [open, setOpen] = useState(false);
  const showLoading = useDeferredLoadingIndicator(scanPending && targets.length === 0);
  const showProgressBar = useDeferredLoadingIndicator(scanPending, IMAGE_PAGE_TARGET_SCAN_PROGRESS_DELAY_MS);
  const loadingProgress = useMemo(
    () => resolveImagePageTargetScanLoadingProgress(scanProgress, showProgressBar),
    [scanProgress, showProgressBar]
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Opening the sheet kicks off the scan; an already-scanned page (e.g. restored from cache) just shows its list.
    if (next && !pageScanned && !scanPending) {
      onScan();
    }
  };

  const isEmpty = pageScanned && targets.length === 0 && !scanPending;

  const scanTrigger = (
    <DrawerTrigger asChild>
      <Button type="button" variant="default" size="actionCard">
        {scanPending ? null : <IconRefresh data-icon="inline-start" aria-hidden stroke={1.5} />}
        <span>{scanPending ? IMAGE_TARGET_STEP_SCAN_PENDING : IMAGE_TARGET_STEP_SCAN_LABEL}</span>
      </Button>
    </DrawerTrigger>
  );

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      {surface ? (
        <ImageEditorSelectedSurfacePanel
          addableScopes={surface.addableScopes}
          discoveryPending={surface.discoveryPending}
          existingPresets={surface.existingPresets}
          onAddScope={surface.onAddScope}
          onEditPreset={surface.onEditPreset}
          scanAction={scanTrigger}
          target={surface.target}
        />
      ) : (
        scanTrigger
      )}
      <DrawerContent {...drawerListSheetContentDefaults}>
        <DrawerHeader align="start">
          <DrawerTitle>{IMAGE_TARGET_STEP_ON_PAGE}</DrawerTitle>
          <DrawerDescription>{IMAGE_TARGET_STEP_SHEET_DESCRIPTION}</DrawerDescription>
        </DrawerHeader>
        <DrawerScrollList
          aria-label={IMAGE_TARGET_STEP_SHEET_LIST_LABEL}
          data-slot="image_editor_page_target_scan_list"
          error={scanError}
          isEmpty={isEmpty}
          emptyMessage={IMAGE_TARGET_STEP_EMPTY}
          listless
          loading={showLoading}
          loadingAlign="top"
          loadingAriaLabel={IMAGE_TARGET_STEP_SCAN_PENDING}
          loadingContent={loadingProgress ? <ImagePageTargetScanProgressBar progress={loadingProgress} /> : undefined}
        >
          <ImagePageTargetSelectList
            idPrefix={idPrefix}
            onSelectTarget={onSelectTarget}
            selectedTarget={selectedTarget}
            targets={targets}
          />
        </DrawerScrollList>
        <DrawerFooter layout="sticky" orientation="horizontal">
          <Button type="button" variant="outline" size="sm" disabled={scanPending} onClick={onScan}>
            {IMAGE_TARGET_STEP_RESCAN_LABEL}
          </Button>
          <DrawerClose asChild>
            <Button type="button" variant="default" size="sm" disabled={selectedTarget == null}>
              {IMAGE_TARGET_STEP_SELECT_LABEL}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
