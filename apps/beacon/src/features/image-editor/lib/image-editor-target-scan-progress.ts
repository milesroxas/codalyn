import {
  IMAGE_TARGET_STEP_SCAN_COLLECTING,
  IMAGE_TARGET_STEP_SCAN_PENDING,
} from "@/features/image-editor/lib/image-editor-target-step-copy";
import type { ImagePageTargetScanProgress } from "@/features/image-editor/lib/scan-image-targets-on-page";

export type ImageEditorTargetScanProgressView = {
  /** 0–100 during the scanning phase. */
  value: number | null;
  /** Marquee bar for phases without a known total yet. */
  indeterminate: boolean;
  label: string;
  detail: string;
};

export const IMAGE_PAGE_TARGET_SCAN_PROGRESS_DELAY_MS = 1500;

export const IMAGE_PAGE_TARGET_SCAN_FALLBACK_PROGRESS: ImagePageTargetScanProgress = {
  phase: "collecting",
  scannedElements: 0,
  totalElements: 0,
  foundTargets: 0,
};

export function resolveImagePageTargetScanLoadingProgress(
  scanProgress: ImagePageTargetScanProgress | null,
  showProgressBar: boolean
): ImageEditorTargetScanProgressView | null {
  if (!showProgressBar) {
    return null;
  }
  return formatImagePageTargetScanProgress(scanProgress ?? IMAGE_PAGE_TARGET_SCAN_FALLBACK_PROGRESS);
}

export function formatImagePageTargetScanCollectionDetail(discovered: number): string {
  return `${discovered.toLocaleString()} elements mapped…`;
}

export function formatImagePageTargetScanProgress(
  progress: ImagePageTargetScanProgress
): ImageEditorTargetScanProgressView {
  if (progress.phase === "collecting") {
    const { scannedElements } = progress;
    return {
      value: null,
      indeterminate: true,
      label: IMAGE_TARGET_STEP_SCAN_PENDING,
      detail:
        scannedElements > 0
          ? formatImagePageTargetScanCollectionDetail(scannedElements)
          : IMAGE_TARGET_STEP_SCAN_COLLECTING,
    };
  }

  const { scannedElements, totalElements, foundTargets } = progress;
  const value =
    totalElements > 0
      ? Math.min(100, Math.round((scannedElements / totalElements) * 100))
      : scannedElements > 0
        ? 100
        : 0;
  const detail =
    totalElements > 0
      ? `${scannedElements.toLocaleString()} of ${totalElements.toLocaleString()} elements${foundTargets > 0 ? ` · ${foundTargets} found` : ""}`
      : IMAGE_TARGET_STEP_SCAN_COLLECTING;

  return {
    value,
    indeterminate: false,
    label: IMAGE_TARGET_STEP_SCAN_PENDING,
    detail,
  };
}
