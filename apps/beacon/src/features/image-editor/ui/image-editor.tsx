import type { DragEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Area } from "react-easy-crop";

import type { PlacementMode } from "@/features/image-editor/lib/apply-cropped-export";
import { parseOutputDimension } from "@/features/image-editor/lib/apply-cropped-export";
import { type AspectPreset, aspectValue } from "@/features/image-editor/lib/aspect-preset";
import { useApplyCroppedToWebflow } from "@/features/image-editor/model/use-apply-cropped-to-webflow";
import { useComponentInstanceImageProps } from "@/features/image-editor/model/use-component-instance-image-props";
import { useExportByteEstimate } from "@/features/image-editor/model/use-export-byte-estimate";
import { useImageDissolveTransition } from "@/features/image-editor/model/use-image-dissolve-transition";
import { useImageEditorAssetFolders } from "@/features/image-editor/model/use-image-editor-asset-folders";
import { useImageOutputDimensionsOnLoad } from "@/features/image-editor/model/use-image-output-dimensions-on-load";
import { useRevokeBlobUrlOnChange } from "@/features/image-editor/model/use-revoke-blob-url";
import {
  type CropFrameMode,
  ImageEditorCropExportPanel,
} from "@/features/image-editor/ui/image-editor-crop-export-panel";
import { LoadedImageSourceSection } from "@/features/image-editor/ui/image-editor-source-sections";
import { ImageEditorWorkspace } from "@/features/image-editor/ui/image-editor-workspace";
import { cn } from "@/shared/lib/utils";

export function ImageEditor() {
  const baseId = useId();
  const fileInputId = `${baseId}-file`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>("free");
  const [cropFrameMode, setCropFrameMode] = useState<CropFrameMode>("aspect");
  const [completedCrop, setCompletedCrop] = useState<Area | null>(null);
  const [outputWidth, setOutputWidth] = useState(1200);
  const [outputHeight, setOutputHeight] = useState(1200);
  const [widthStr, setWidthStr] = useState("1200");
  const [heightStr, setHeightStr] = useState("1200");
  const [fileBaseName, setFileBaseName] = useState("edited");
  const [quality, setQuality] = useState(0.75);
  const [placement, setPlacement] = useState<PlacementMode>("selection");
  const [replaceLibraryAsset, setReplaceLibraryAsset] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [originalBytes, setOriginalBytes] = useState<number | null>(null);

  const {
    assetFolders,
    foldersLoading,
    folderActionBusy,
    selectedAssetFolderId,
    setSelectedAssetFolderId,
    createAssetFolderNamed,
  } = useImageEditorAssetFolders(imageSrc);

  const {
    componentImageProps,
    selectedComponentImagePropId,
    setSelectedComponentImagePropId,
    selectedElementType,
    componentImagePropsResolving,
  } = useComponentInstanceImageProps();

  const {
    dissolve,
    dissolving,
    queueFile,
    finishDissolve,
    handleOutgoingFadeComplete,
    beginOutgoingFade,
    showIncomingPreview,
    incomingEnter,
  } = useImageDissolveTransition({ setImageSrc, setOriginalBytes, setFileBaseName });

  useEffect(() => {
    void webflow.setExtensionSize({ width: 440, height: 880 });
  }, []);

  useImageOutputDimensionsOnLoad(
    imageSrc,
    setOutputWidth,
    setOutputHeight,
    setWidthStr,
    setHeightStr,
    setCrop,
    setZoom,
    setCompletedCrop,
    setImageSrc
  );

  useRevokeBlobUrlOnChange(imageSrc);

  const effectiveOutputW = useMemo(() => parseOutputDimension(widthStr, outputWidth), [widthStr, outputWidth]);
  const effectiveOutputH = useMemo(() => parseOutputDimension(heightStr, outputHeight), [heightStr, outputHeight]);

  const cropAspect = useMemo(() => {
    if (cropFrameMode === "custom") {
      const h = effectiveOutputH;
      if (h <= 0) {
        return undefined;
      }
      return effectiveOutputW / h;
    }
    return aspectValue(aspectPreset);
  }, [cropFrameMode, effectiveOutputW, effectiveOutputH, aspectPreset]);

  const { estimatedBytes, estimatePending, estimateNonce, onQualityCommit } = useExportByteEstimate({
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    quality,
  });

  const { busy, applyToCanvas } = useApplyCroppedToWebflow({
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
  });

  const onCropComplete = useCallback((_c: Area, px: Area) => {
    setCompletedCrop(px);
  }, []);

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragState = useCallback((e: DragEvent, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(active);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      handleDragState(e, false);
      const file = e.dataTransfer.files?.[0];
      queueFile(file);
    },
    [handleDragState, queueFile]
  );

  const dropZoneLabelClass = cn(
    "flex aspect-video w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors",
    dragActive ? "border-primary bg-accent/40" : "border-border bg-muted/30"
  );

  const loadedEditor =
    imageSrc != null ? (
      <div className="flex flex-col gap-3">
        <LoadedImageSourceSection busy={busy} fileBaseName={fileBaseName} fileInputRef={fileInputRef} />
        <div className="flex flex-col gap-3 px-4">
          <ImageEditorCropExportPanel
            aspectPreset={aspectPreset}
            assetFolders={assetFolders}
            baseId={baseId}
            busy={busy}
            completedCrop={completedCrop}
            componentImageProps={componentImageProps}
            crop={crop}
            cropAspect={cropAspect}
            cropFrameMode={cropFrameMode}
            estimateNonce={estimateNonce}
            estimatePending={estimatePending}
            estimatedBytes={estimatedBytes}
            fileBaseName={fileBaseName}
            folderActionBusy={folderActionBusy}
            foldersLoading={foldersLoading}
            heightStr={heightStr}
            imageSrc={imageSrc}
            onApplyToCanvas={applyToCanvas}
            onCreateAssetFolder={createAssetFolderNamed}
            onCropComplete={onCropComplete}
            onQualityCommit={onQualityCommit}
            originalBytes={originalBytes}
            outputHeight={outputHeight}
            outputWidth={outputWidth}
            placement={placement}
            quality={quality}
            replaceLibraryAsset={replaceLibraryAsset}
            selectedAssetFolderId={selectedAssetFolderId}
            selectedComponentImagePropId={selectedComponentImagePropId}
            selectedElementType={selectedElementType}
            componentImagePropsResolving={componentImagePropsResolving}
            setAspectPreset={setAspectPreset}
            setCrop={setCrop}
            setCropFrameMode={setCropFrameMode}
            setFileBaseName={setFileBaseName}
            setHeightStr={setHeightStr}
            setOutputHeight={setOutputHeight}
            setOutputWidth={setOutputWidth}
            setPlacement={setPlacement}
            setQuality={setQuality}
            setReplaceLibraryAsset={setReplaceLibraryAsset}
            setSelectedAssetFolderId={setSelectedAssetFolderId}
            setSelectedComponentImagePropId={setSelectedComponentImagePropId}
            setWidthStr={setWidthStr}
            setZoom={setZoom}
            widthStr={widthStr}
            zoom={zoom}
          />
        </div>
      </div>
    ) : null;

  return (
    <ImageEditorWorkspace
      beginOutgoingFade={beginOutgoingFade}
      dissolve={dissolve}
      dissolving={dissolving}
      dropZoneLabelClass={dropZoneLabelClass}
      fileInputId={fileInputId}
      fileInputRef={fileInputRef}
      finishDissolve={finishDissolve}
      handleDrag={handleDrag}
      handleDragState={handleDragState}
      handleDrop={handleDrop}
      handleOutgoingFadeComplete={handleOutgoingFadeComplete}
      imageSrc={imageSrc}
      incomingEnter={incomingEnter}
      loadedEditor={loadedEditor}
      queueFile={queueFile}
      showIncomingPreview={showIncomingPreview}
    />
  );
}
