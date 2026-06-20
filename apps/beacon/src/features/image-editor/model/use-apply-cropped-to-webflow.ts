import { BEACON_IMAGE_ERROR_CODES, type BeaconImageErrorCode, type ImageExportFormat } from "@codalyn/webflow-kit";
import { useCallback, useState } from "react";
import type { Area } from "react-easy-crop";

import {
  applyCroppedImageToWebflow,
  downloadCroppedImageWebp,
  type ExportResult,
  type ImageExportSuccessContext,
  type PlacementMode,
} from "@/features/image-editor/lib/apply-cropped-export";
import { resolveAssetFolderHandleForExport } from "@/features/image-editor/lib/asset-folder-ops";
import type { AssetFolderRow } from "@/features/image-editor/lib/asset-folder-row";
import type { ComponentImagePropOption } from "@/features/image-editor/lib/component-image-prop";
import { sanitizeAssetBaseName } from "@/features/image-editor/lib/sanitize-asset-base-name";
import type { TowerUsageLimitDetails } from "@/shared/lib/tower-usage-limit-error";

function folderMissingMessage(assetFolders: AssetFolderRow[]): string {
  return assetFolders.length === 0 ? "Create an Assets folder first." : "Choose an Assets folder first.";
}

async function notifyExportResult(
  result: ExportResult,
  onUsageLimit?: (details: TowerUsageLimitDetails) => void
): Promise<void> {
  if (result.kind === "usage-limit") {
    onUsageLimit?.(result.details);
    return;
  }
  if (result.kind === "success") {
    return;
  }
  if (result.kind === "info") {
    await webflow.notify({ type: "Info", message: result.message });
    return;
  }
  await webflow.notify({ type: "Error", message: result.message });
}

function toExportSuccessContext(result: Extract<ExportResult, { kind: "success" }>): ImageExportSuccessContext {
  return {
    message: result.message,
    cmsFieldUpdated: result.cmsFieldUpdated === true,
    asset: result.asset,
  };
}

function syncExportDimensionsToState(
  w: number,
  h: number,
  safeName: string,
  setters: {
    setOutputWidth: (n: number) => void;
    setOutputHeight: (n: number) => void;
    setWidthStr: (s: string) => void;
    setHeightStr: (s: string) => void;
    setFileBaseName: (s: string) => void;
  }
): void {
  setters.setOutputWidth(w);
  setters.setOutputHeight(h);
  setters.setWidthStr(String(w));
  setters.setHeightStr(String(h));
  setters.setFileBaseName(safeName);
}

async function exportDownloadPlacement(args: {
  imageSrc: string;
  completedCrop: Area;
  w: number;
  h: number;
  quality: number;
  safeName: string;
  dimSetters: Parameters<typeof syncExportDimensionsToState>[3];
  setBusy: (v: boolean) => void;
  onSuccess: (context: ImageExportSuccessContext) => void;
  onUsageLimit?: (details: TowerUsageLimitDetails) => void;
}): Promise<void> {
  const { imageSrc, completedCrop, w, h, quality, safeName, dimSetters, setBusy, onSuccess, onUsageLimit } = args;
  setBusy(true);
  try {
    syncExportDimensionsToState(w, h, safeName, dimSetters);
    const result = await downloadCroppedImageWebp({
      imageSrc,
      completedCrop,
      outputWidth: w,
      outputHeight: h,
      quality,
      fileBaseName: safeName,
    });
    if (result.kind === "success") {
      onSuccess(toExportSuccessContext(result));
    }
    await notifyExportResult(result, onUsageLimit);
  } finally {
    setBusy(false);
  }
}

async function exportWebflowPlacement(args: {
  imageSrc: string;
  completedCrop: Area;
  w: number;
  h: number;
  quality: number;
  exportFormat: ImageExportFormat;
  safeName: string;
  dimSetters: Parameters<typeof syncExportDimensionsToState>[3];
  setBusy: (v: boolean) => void;
  componentImageProps: ComponentImagePropOption[];
  selectedComponentImagePropId: string | null;
  currentCmsItemId: string | null;
  targetFolder: AssetFolder | null;
  placement: PlacementMode;
  replaceLibraryAsset: boolean;
  onSuccess: (context: ImageExportSuccessContext) => void;
  onUsageLimit?: (details: TowerUsageLimitDetails) => void;
}): Promise<void> {
  const {
    imageSrc,
    completedCrop,
    w,
    h,
    quality,
    exportFormat,
    safeName,
    dimSetters,
    setBusy,
    componentImageProps,
    selectedComponentImagePropId,
    currentCmsItemId,
    targetFolder,
    placement,
    replaceLibraryAsset,
    onSuccess,
    onUsageLimit,
  } = args;
  setBusy(true);
  try {
    syncExportDimensionsToState(w, h, safeName, dimSetters);
    const result = await applyCroppedImageToWebflow({
      imageSrc,
      completedCrop,
      outputWidth: w,
      outputHeight: h,
      quality,
      exportFormat,
      fileBaseName: safeName,
      componentImagePropId: componentImageProps.length > 1 ? selectedComponentImagePropId : null,
      currentCmsItemId,
      targetFolder,
      placement,
      replaceLibraryAsset: placement === "replace" ? replaceLibraryAsset : false,
    });
    if (result.kind === "success") {
      onSuccess(toExportSuccessContext(result));
    }
    await notifyExportResult(result, onUsageLimit);
  } finally {
    setBusy(false);
  }
}

export function useApplyCroppedToWebflow(options: {
  imageSrc: string | null;
  completedCrop: Area | null;
  effectiveOutputW: number;
  effectiveOutputH: number;
  quality: number;
  exportFormat: ImageExportFormat;
  fileBaseName: string;
  setFileBaseName: (s: string) => void;
  setOutputWidth: (n: number) => void;
  setOutputHeight: (n: number) => void;
  setWidthStr: (s: string) => void;
  setHeightStr: (s: string) => void;
  componentImageProps: ComponentImagePropOption[];
  selectedComponentImagePropId: string | null;
  currentCmsItemId: string | null;
  assetFolders: AssetFolderRow[];
  selectedAssetFolderId: string | null;
  placement: PlacementMode;
  replaceLibraryAsset: boolean;
  cmsPrimaryUpload: boolean;
  /** When set, export must not run (preset size guard). */
  exportPlaceBlockedLabel: string | null;
  exportPlaceBlockedCode?: BeaconImageErrorCode | null;
  /** Called synchronously when export succeeds, before busy clears. */
  onExportSuccess?: (context: ImageExportSuccessContext) => void;
  onTowerUsageLimit?: (details: TowerUsageLimitDetails) => void;
}) {
  const {
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    quality,
    exportFormat,
    fileBaseName,
    setFileBaseName,
    setOutputWidth,
    setOutputHeight,
    setWidthStr,
    setHeightStr,
    componentImageProps,
    selectedComponentImagePropId,
    currentCmsItemId,
    assetFolders,
    selectedAssetFolderId,
    placement,
    replaceLibraryAsset,
    cmsPrimaryUpload,
    exportPlaceBlockedLabel,
    exportPlaceBlockedCode = null,
    onExportSuccess,
    onTowerUsageLimit,
  } = options;

  const [busy, setBusy] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<ImageExportSuccessContext | null>(null);

  const clearExportSuccess = useCallback(() => {
    setExportSuccess(null);
  }, []);

  const reportExportSuccess = useCallback(
    (context: ImageExportSuccessContext) => {
      setExportSuccess(context);
      onExportSuccess?.(context);
    },
    [onExportSuccess]
  );

  const applyToCanvas = useCallback(async () => {
    if (exportPlaceBlockedLabel) {
      await webflow.notify({
        type:
          exportPlaceBlockedCode === BEACON_IMAGE_ERROR_CODES.EXPORT_PRESET_FILE_LIMIT_EXCEEDED ? "Error" : "Warning",
        message: exportPlaceBlockedLabel,
      });
      return;
    }
    if (!imageSrc || !completedCrop) {
      await webflow.notify({
        type: "Warning",
        message: "Load an image and adjust the crop first.",
      });
      return;
    }
    const w = effectiveOutputW;
    const h = effectiveOutputH;
    const safeName = sanitizeAssetBaseName(fileBaseName);
    const dimSetters = {
      setOutputWidth,
      setOutputHeight,
      setWidthStr,
      setHeightStr,
      setFileBaseName,
    };

    if (placement === "download") {
      await exportDownloadPlacement({
        imageSrc,
        completedCrop,
        w,
        h,
        quality,
        safeName,
        dimSetters,
        setBusy,
        onSuccess: reportExportSuccess,
        onUsageLimit: onTowerUsageLimit,
      });
      return;
    }

    const targetFolder = resolveAssetFolderHandleForExport(selectedAssetFolderId, assetFolders, {
      useDefaultWhenUnpicked: cmsPrimaryUpload,
    });
    if (!targetFolder && !cmsPrimaryUpload) {
      await webflow.notify({
        type: "Warning",
        message: folderMissingMessage(assetFolders),
      });
      return;
    }
    await exportWebflowPlacement({
      imageSrc,
      completedCrop,
      w,
      h,
      quality,
      exportFormat,
      safeName,
      dimSetters,
      setBusy,
      componentImageProps,
      selectedComponentImagePropId,
      currentCmsItemId,
      targetFolder: targetFolder ?? null,
      placement,
      replaceLibraryAsset,
      onSuccess: reportExportSuccess,
      onUsageLimit: onTowerUsageLimit,
    });
  }, [
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    quality,
    exportFormat,
    fileBaseName,
    setFileBaseName,
    setOutputWidth,
    setOutputHeight,
    setWidthStr,
    setHeightStr,
    componentImageProps,
    selectedComponentImagePropId,
    currentCmsItemId,
    selectedAssetFolderId,
    assetFolders,
    placement,
    replaceLibraryAsset,
    cmsPrimaryUpload,
    exportPlaceBlockedLabel,
    exportPlaceBlockedCode,
    reportExportSuccess,
    onTowerUsageLimit,
  ]);

  return { busy, applyToCanvas, exportSuccess, clearExportSuccess };
}
