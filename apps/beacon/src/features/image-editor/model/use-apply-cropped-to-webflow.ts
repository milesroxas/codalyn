import { useCallback, useState } from "react";
import type { Area } from "react-easy-crop";

import { applyCroppedImageToWebflow, type PlacementMode } from "@/features/image-editor/lib/apply-cropped-export";
import { resolveSelectedAssetFolderHandle } from "@/features/image-editor/lib/asset-folder-ops";
import type { AssetFolderRow } from "@/features/image-editor/lib/asset-folder-row";
import type { ComponentImagePropOption } from "@/features/image-editor/lib/component-image-prop";
import { sanitizeAssetBaseName } from "@/features/image-editor/lib/sanitize-asset-base-name";

export function useApplyCroppedToWebflow(options: {
  imageSrc: string | null;
  completedCrop: Area | null;
  effectiveOutputW: number;
  effectiveOutputH: number;
  quality: number;
  fileBaseName: string;
  setFileBaseName: (s: string) => void;
  setOutputWidth: (n: number) => void;
  setOutputHeight: (n: number) => void;
  setWidthStr: (s: string) => void;
  setHeightStr: (s: string) => void;
  componentImageProps: ComponentImagePropOption[];
  selectedComponentImagePropId: string | null;
  assetFolders: AssetFolderRow[];
  selectedAssetFolderId: string | null;
  placement: PlacementMode;
  replaceLibraryAsset: boolean;
}) {
  const {
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    quality,
    fileBaseName,
    setFileBaseName,
    setOutputWidth,
    setOutputHeight,
    setWidthStr,
    setHeightStr,
    componentImageProps,
    selectedComponentImagePropId,
    assetFolders,
    selectedAssetFolderId,
    placement,
    replaceLibraryAsset,
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
    const targetFolder = resolveSelectedAssetFolderHandle(selectedAssetFolderId, assetFolders);
    if (!targetFolder) {
      await webflow.notify({
        type: "Warning",
        message: "Choose an Assets folder first.",
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
        fileBaseName: safeName,
        componentImagePropId: componentImageProps.length > 1 ? selectedComponentImagePropId : null,
        targetFolder,
        placement,
        replaceLibraryAsset: placement === "replace" ? replaceLibraryAsset : false,
      });
      if (result.kind === "success") {
        await webflow.notify({ type: "Success", message: result.message });
        return;
      }
      if (result.kind === "info") {
        await webflow.notify({ type: "Info", message: result.message });
        return;
      }
      await webflow.notify({ type: "Error", message: result.message });
    } finally {
      setBusy(false);
    }
  }, [
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    quality,
    fileBaseName,
    setFileBaseName,
    setOutputWidth,
    setOutputHeight,
    setWidthStr,
    setHeightStr,
    componentImageProps.length,
    selectedComponentImagePropId,
    selectedAssetFolderId,
    assetFolders,
    placement,
    replaceLibraryAsset,
  ]);

  return { busy, applyToCanvas };
}
