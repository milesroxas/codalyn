import type { ImageExportFormat } from "@codalyn/webflow-kit";
import { useCallback, useState } from "react";
import type { Area } from "react-easy-crop";

import {
  applyCroppedImageToWebflow,
  downloadCroppedImageWebp,
  type ExportResult,
  type PlacementMode,
} from "@/features/image-editor/lib/apply-cropped-export";
import { resolveAssetFolderHandleForExport } from "@/features/image-editor/lib/asset-folder-ops";
import type { AssetFolderRow } from "@/features/image-editor/lib/asset-folder-row";
import type { ComponentImagePropOption } from "@/features/image-editor/lib/component-image-prop";
import { sanitizeAssetBaseName } from "@/features/image-editor/lib/sanitize-asset-base-name";

function folderMissingMessage(assetFolders: AssetFolderRow[]): string {
  return assetFolders.length === 0 ? "Create an Assets folder first." : "Choose an Assets folder first.";
}

async function notifyExportResult(result: ExportResult): Promise<void> {
  if (result.kind === "success") {
    await webflow.notify({ type: "Success", message: result.message });
    return;
  }
  if (result.kind === "info") {
    await webflow.notify({ type: "Info", message: result.message });
    return;
  }
  await webflow.notify({ type: "Error", message: result.message });
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
}): Promise<void> {
  const { imageSrc, completedCrop, w, h, quality, safeName, dimSetters, setBusy } = args;
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
    await notifyExportResult(result);
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
  targetFolder: AssetFolder;
  placement: PlacementMode;
  replaceLibraryAsset: boolean;
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
    await notifyExportResult(result);
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
  } = options;

  const [busy, setBusy] = useState(false);

  const applyToCanvas = useCallback(async () => {
    if (exportPlaceBlockedLabel) {
      await webflow.notify({
        type: exportPlaceBlockedLabel === "Over preset file limit" ? "Error" : "Warning",
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
      });
      return;
    }

    const targetFolder = resolveAssetFolderHandleForExport(selectedAssetFolderId, assetFolders, {
      useDefaultWhenUnpicked: cmsPrimaryUpload,
    });
    if (!targetFolder) {
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
      targetFolder,
      placement,
      replaceLibraryAsset,
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
  ]);

  return { busy, applyToCanvas };
}
