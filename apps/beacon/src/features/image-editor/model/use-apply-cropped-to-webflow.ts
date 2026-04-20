import type { ImageExportFormat } from "@codalyn/webflow-kit";
import { useCallback, useState } from "react";
import type { Area } from "react-easy-crop";

import {
  applyCroppedImageToWebflow,
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
  } = options;

  const [busy, setBusy] = useState(false);

  const applyToCanvas = useCallback(async () => {
    if (!imageSrc || !completedCrop) {
      await webflow.notify({
        type: "Warning",
        message: "Load an image and adjust the crop first.",
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
    setBusy(true);
    try {
      const w = effectiveOutputW;
      const h = effectiveOutputH;
      setOutputWidth(w);
      setOutputHeight(h);
      setWidthStr(String(w));
      setHeightStr(String(h));
      const safeName = sanitizeAssetBaseName(fileBaseName);
      setFileBaseName(safeName);

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
    componentImageProps.length,
    selectedComponentImagePropId,
    currentCmsItemId,
    selectedAssetFolderId,
    assetFolders,
    placement,
    replaceLibraryAsset,
    cmsPrimaryUpload,
  ]);

  return { busy, applyToCanvas };
}
