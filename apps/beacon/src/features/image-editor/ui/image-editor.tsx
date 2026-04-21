import {
  type BeaconImagePresetRow,
  getVisibleBuiltinAspectPresets,
  type ImageExportFormat,
} from "@codalyn/webflow-kit";
import type { DragEvent, SetStateAction } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import { getTowerAuthBaseUrl, isTowerConfigured } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import type { PlacementMode } from "@/features/image-editor/lib/apply-cropped-export";
import { outputDimensionsMatchingCrop, parseOutputDimension } from "@/features/image-editor/lib/apply-cropped-export";
import { type AspectPreset, aspectValue } from "@/features/image-editor/lib/aspect-preset";
import { isCmsPrimaryUploadContext } from "@/features/image-editor/lib/cms-primary-upload-context";
import {
  type ExportPresetDefaults,
  resolvePresetExportFormat,
  resolvePresetExportQuality,
} from "@/features/image-editor/lib/export-preset";
import { formatFileSize } from "@/features/image-editor/lib/format-file-size";
import { openQualityComparePopout } from "@/features/image-editor/lib/open-quality-compare-popout";
import { useApplyCroppedToWebflow } from "@/features/image-editor/model/use-apply-cropped-to-webflow";
import { useCmsCollectionTemplatePage } from "@/features/image-editor/model/use-cms-collection-template-page";
import { useComponentInstanceImageProps } from "@/features/image-editor/model/use-component-instance-image-props";
import { useExportByteEstimate } from "@/features/image-editor/model/use-export-byte-estimate";
import { useExportQualityPreview } from "@/features/image-editor/model/use-export-quality-preview";
import { useImageDissolveTransition } from "@/features/image-editor/model/use-image-dissolve-transition";
import { useImageEditorAssetFolders } from "@/features/image-editor/model/use-image-editor-asset-folders";
import { useImageOutputDimensionsOnLoad } from "@/features/image-editor/model/use-image-output-dimensions-on-load";
import { useQualityPopoutBridge } from "@/features/image-editor/model/use-quality-popout-bridge";
import { useRevokeBlobUrlOnChange } from "@/features/image-editor/model/use-revoke-blob-url";
import {
  type CropFrameMode,
  ImageEditorCropExportPanel,
} from "@/features/image-editor/ui/image-editor-crop-export-panel";
import { ImageEditorOnboarding } from "@/features/image-editor/ui/image-editor-onboarding";
import {
  EmptyImageSourceSection,
  LoadedImageSourceSection,
} from "@/features/image-editor/ui/image-editor-source-sections";
import { ImageEditorWorkspace } from "@/features/image-editor/ui/image-editor-workspace";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { cn } from "@/shared/lib/utils";

const TOWER_EMAIL_AUTH_POPUP_FEATURES = "popup=yes,width=540,height=780,scrollbars=yes,resizable=yes";

type ImageEditorProps = {
  onOnboardingVisibilityChange?: (visible: boolean) => void;
};

export function ImageEditor(props: ImageEditorProps = {}) {
  const { onOnboardingVisibilityChange } = props;
  const { settings, updateSettings, canPersistExportDefaults, syncState } = useBeaconAppSettings();
  const baseId = useId();
  const fileInputId = `${baseId}-file`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>(settings.defaultAspectPreset);
  const [cropFrameMode, setCropFrameMode] = useState<CropFrameMode>("aspect");
  const [completedCrop, setCompletedCrop] = useState<Area | null>(null);
  const [outputWidth, setOutputWidth] = useState(1200);
  const [outputHeight, setOutputHeight] = useState(1200);
  const [widthStr, setWidthStr] = useState("1200");
  const [heightStr, setHeightStr] = useState("1200");
  const [fileBaseName, setFileBaseName] = useState("edited");
  const [quality, setQuality] = useState(settings.defaultExportQuality);
  const [exportFormat, setExportFormat] = useState<ImageExportFormat>(settings.defaultExportFormat);
  const [placement, setPlacement] = useState<PlacementMode>("library");
  const [replaceLibraryAsset, setReplaceLibraryAsset] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [originalBytes, setOriginalBytes] = useState<number | null>(null);
  const [guestOnboardingComplete, setGuestOnboardingComplete] = useState(false);
  /** True after user picks "Custom (manual)" in preset dropdown; shows format/quality/dimension editors even if values still match a preset. */
  const [exportPresetManualOverride, setExportPresetManualOverride] = useState(false);
  /** Preset chosen from the dropdown; kept while dimensions and format match so quality can differ from the preset target. */
  const [selectedExportPresetId, setSelectedExportPresetId] = useState<string | null>(null);
  const [imageSrc, setImageSrcInternal] = useState<string | null>(null);
  const setImageSrc = useCallback((action: SetStateAction<string | null>) => {
    setExportPresetManualOverride(false);
    setSelectedExportPresetId(null);
    setImageSrcInternal(action);
  }, []);
  const { user: towerUser, isPending: towerSessionPending } = useBeaconTowerSession();
  const exportDefaultsHydratedRef = useRef(!towerUser?.id);
  const serverExportDefaultsAppliedRef = useRef(false);
  const towerConfigured = isTowerConfigured();
  const allowAvifEncoding = Boolean(towerUser);
  const isConfirmedGuest = !towerUser && !towerSessionPending;
  const cmsCollectionTemplatePage = useCmsCollectionTemplatePage();
  const guestCmsTemplateRestricted = isConfirmedGuest && cmsCollectionTemplatePage;
  /** Guest onboarding only after Tower session resolves; while pending, show the empty drop zone (no loading interstitial). */
  const showGuestOnboarding = !imageSrc && !towerSessionPending && !towerUser && !guestOnboardingComplete;

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
    currentCmsItemId,
    componentImagePropsResolving,
    elementCmsBinding,
    elementCmsBindingLoading,
  } = useComponentInstanceImageProps();

  const visibleBuiltinAspectPresets = useMemo(() => getVisibleBuiltinAspectPresets(settings), [settings]);

  useEffect(() => {
    if (visibleBuiltinAspectPresets.length === 0) {
      return;
    }
    if (!visibleBuiltinAspectPresets.includes(aspectPreset)) {
      const next = visibleBuiltinAspectPresets[0];
      if (next !== undefined) {
        setAspectPreset(next);
      }
    }
  }, [visibleBuiltinAspectPresets, aspectPreset]);

  const cmsPrimaryUpload = useMemo(
    () =>
      isCmsPrimaryUploadContext({
        currentCmsItemId,
        placement,
        selectedElementType,
        elementCmsBinding,
        componentImagePropsResolving,
        componentImageProps,
        selectedComponentImagePropId,
      }),
    [
      currentCmsItemId,
      placement,
      selectedElementType,
      elementCmsBinding,
      componentImagePropsResolving,
      componentImageProps,
      selectedComponentImagePropId,
    ]
  );

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

  useEffect(() => {
    exportDefaultsHydratedRef.current = !towerUser?.id;
    serverExportDefaultsAppliedRef.current = false;
  }, [towerUser?.id]);

  useEffect(() => {
    if (!towerUser?.id || syncState !== "synced" || serverExportDefaultsAppliedRef.current) {
      return;
    }
    serverExportDefaultsAppliedRef.current = true;
    setExportFormat(settings.defaultExportFormat);
    setQuality(settings.defaultExportQuality);
    setAspectPreset(settings.defaultAspectPreset);
    exportDefaultsHydratedRef.current = true;
  }, [towerUser?.id, syncState, settings]);

  useEffect(() => {
    if (!exportDefaultsHydratedRef.current || !canPersistExportDefaults) {
      return;
    }
    updateSettings({
      defaultExportFormat: exportFormat,
      defaultExportQuality: quality,
      defaultAspectPreset: aspectPreset,
    });
  }, [exportFormat, quality, aspectPreset, canPersistExportDefaults, updateSettings]);

  useEffect(() => {
    if (!allowAvifEncoding && exportFormat === "avif") {
      setExportFormat("webp");
    }
  }, [allowAvifEncoding, exportFormat]);

  useEffect(() => {
    if (towerUser) {
      setGuestOnboardingComplete(true);
    }
  }, [towerUser]);

  useEffect(() => {
    onOnboardingVisibilityChange?.(showGuestOnboarding);
  }, [onOnboardingVisibilityChange, showGuestOnboarding]);

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

  const parsedOutputW = useMemo(() => parseOutputDimension(widthStr, outputWidth), [widthStr, outputWidth]);
  const parsedOutputH = useMemo(() => parseOutputDimension(heightStr, outputHeight), [heightStr, outputHeight]);

  const exportPresetDefaults: ExportPresetDefaults = useMemo(
    () => ({
      exportFormat: settings.defaultExportFormat,
      exportQuality: settings.defaultExportQuality,
    }),
    [settings.defaultExportFormat, settings.defaultExportQuality]
  );

  const applyExportPreset = useCallback(
    (preset: BeaconImagePresetRow) => {
      setExportPresetManualOverride(false);
      setSelectedExportPresetId(preset.id);
      const fmtRaw = resolvePresetExportFormat(preset, exportPresetDefaults);
      const fmt = !allowAvifEncoding && fmtRaw === "avif" ? "webp" : fmtRaw;
      const qual = resolvePresetExportQuality(preset, exportPresetDefaults);
      setExportFormat(fmt);
      setQuality(qual);
      setOutputWidth(preset.width);
      setOutputHeight(preset.height);
      setWidthStr(String(preset.width));
      setHeightStr(String(preset.height));
      setCropFrameMode("custom");
    },
    [allowAvifEncoding, exportPresetDefaults]
  );

  const formatForPresetMatch = useMemo(
    () => (f: ImageExportFormat) => (!allowAvifEncoding && f === "avif" ? "webp" : f),
    [allowAvifEncoding]
  );

  const selectedExportPresetRow = useMemo(
    () => (selectedExportPresetId ? settings.imagePresets.find((p) => p.id === selectedExportPresetId) : undefined),
    [selectedExportPresetId, settings.imagePresets]
  );

  const selectedExportPresetValid = useMemo(() => {
    if (!selectedExportPresetRow) {
      return false;
    }
    if (parsedOutputW !== selectedExportPresetRow.width || parsedOutputH !== selectedExportPresetRow.height) {
      return false;
    }
    const pf = resolvePresetExportFormat(selectedExportPresetRow, exportPresetDefaults);
    return formatForPresetMatch(pf) === formatForPresetMatch(exportFormat);
  }, [selectedExportPresetRow, parsedOutputW, parsedOutputH, exportFormat, exportPresetDefaults, formatForPresetMatch]);

  useEffect(() => {
    if (!selectedExportPresetId || !selectedExportPresetRow) {
      if (selectedExportPresetId && !selectedExportPresetRow) {
        setSelectedExportPresetId(null);
      }
      return;
    }
    if (!selectedExportPresetValid) {
      setSelectedExportPresetId(null);
    }
  }, [selectedExportPresetId, selectedExportPresetRow, selectedExportPresetValid]);

  const lockCropOutputForPreset = selectedExportPresetValid && !exportPresetManualOverride && !isConfirmedGuest;

  const exportPresetEncodingSummary = useMemo(() => {
    if (!lockCropOutputForPreset || !selectedExportPresetRow) {
      return null;
    }
    const f = resolvePresetExportFormat(selectedExportPresetRow, exportPresetDefaults);
    return `${selectedExportPresetRow.name} · ${f.toUpperCase()} · max ${formatFileSize(selectedExportPresetRow.maxFileSizeBytes)}`;
  }, [lockCropOutputForPreset, selectedExportPresetRow, exportPresetDefaults]);

  const exportPresetFileLimit = useMemo(() => {
    if (!selectedExportPresetValid || !selectedExportPresetRow || isConfirmedGuest) {
      return null;
    }
    return {
      presetName: selectedExportPresetRow.name,
      maxFileSizeBytes: selectedExportPresetRow.maxFileSizeBytes,
      format: resolvePresetExportFormat(selectedExportPresetRow, exportPresetDefaults),
    };
  }, [selectedExportPresetValid, selectedExportPresetRow, exportPresetDefaults, isConfirmedGuest]);

  const activePresetMaxFileBytes = useMemo(
    () => exportPresetFileLimit?.maxFileSizeBytes ?? null,
    [exportPresetFileLimit]
  );

  const exportPresetSelectValue = useMemo(() => {
    if (exportPresetManualOverride) {
      return "__custom__";
    }
    if (!selectedExportPresetId) {
      return "__custom__";
    }
    if (!settings.imagePresets.some((p) => p.id === selectedExportPresetId)) {
      return "__custom__";
    }
    return selectedExportPresetId;
  }, [exportPresetManualOverride, selectedExportPresetId, settings.imagePresets]);

  const { effectiveOutputW, effectiveOutputH } = useMemo(() => {
    if (!completedCrop) {
      return { effectiveOutputW: parsedOutputW, effectiveOutputH: parsedOutputH };
    }
    const { width, height } = outputDimensionsMatchingCrop(completedCrop, parsedOutputW, parsedOutputH);
    return { effectiveOutputW: width, effectiveOutputH: height };
  }, [completedCrop, parsedOutputW, parsedOutputH]);

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
    exportFormat,
  });

  const exportPlaceBlockedLabel = useMemo(() => {
    if (!selectedExportPresetValid || !selectedExportPresetRow || isConfirmedGuest) {
      return null;
    }
    const maxB = selectedExportPresetRow.maxFileSizeBytes;
    if (!completedCrop) {
      return null;
    }
    if (estimatePending || estimatedBytes === null) {
      return "Estimating size…";
    }
    if (estimateNonce === 0) {
      return "Release quality to estimate";
    }
    if (estimatedBytes > maxB) {
      return "Over preset file limit";
    }
    return null;
  }, [
    selectedExportPresetValid,
    selectedExportPresetRow,
    isConfirmedGuest,
    completedCrop,
    estimatePending,
    estimatedBytes,
    estimateNonce,
  ]);

  const { originalPreviewUrl, compressedPreviewUrl, previewPending, getPopoutPreviewBlobs } = useExportQualityPreview({
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    quality,
    exportFormat,
  });

  const qualityPopoutWindowRef = useRef<Window | null>(null);
  useQualityPopoutBridge({
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    exportFormat,
    setQuality,
    onQualityCommit,
    popoutWindowRef: qualityPopoutWindowRef,
  });

  const openQualityPopout = useCallback(() => {
    const blobs = getPopoutPreviewBlobs();
    if (!blobs) {
      return;
    }
    const ar = effectiveOutputH > 0 ? effectiveOutputW / effectiveOutputH : 1;
    const win = openQualityComparePopout({
      originalBlob: blobs.png,
      compressedBlob: blobs.compressed,
      aspectRatio: ar,
      initialQuality: quality,
      targetOrigin: window.location.origin,
    });
    if (win) {
      qualityPopoutWindowRef.current = win;
    }
  }, [getPopoutPreviewBlobs, effectiveOutputW, effectiveOutputH, quality]);

  const { busy, applyToCanvas } = useApplyCroppedToWebflow({
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

  const openTowerEmailSignInPopup = useCallback(() => {
    const base = getTowerAuthBaseUrl();
    if (!base) {
      return;
    }
    const origin = encodeURIComponent(window.location.origin);
    window.open(`${base}/sign-in?beaconOrigin=${origin}`, "beacon-tower-auth", TOWER_EMAIL_AUTH_POPUP_FEATURES);
  }, []);

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
            exportPresets={isConfirmedGuest ? [] : settings.imagePresets}
            onApplyExportPreset={applyExportPreset}
            onExportPresetChooseCustom={() => {
              setExportPresetManualOverride(true);
              setSelectedExportPresetId(null);
            }}
            exportPresetSelectValue={exportPresetSelectValue}
            lockCropOutputForPreset={lockCropOutputForPreset}
            exportPresetEncodingSummary={exportPresetEncodingSummary}
            exportPresetFileLimit={exportPresetFileLimit}
            activePresetMaxFileBytes={activePresetMaxFileBytes}
            exportPlaceBlockedLabel={exportPlaceBlockedLabel}
            aspectPreset={aspectPreset}
            visibleBuiltinAspectPresets={visibleBuiltinAspectPresets}
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
            originalPreviewUrl={originalPreviewUrl}
            compressedPreviewUrl={compressedPreviewUrl}
            previewPending={previewPending}
            outputHeight={outputHeight}
            outputWidth={outputWidth}
            placement={placement}
            quality={quality}
            replaceLibraryAsset={replaceLibraryAsset}
            selectedAssetFolderId={selectedAssetFolderId}
            selectedComponentImagePropId={selectedComponentImagePropId}
            selectedElementType={selectedElementType}
            componentImagePropsResolving={componentImagePropsResolving}
            cmsPrimaryUpload={cmsPrimaryUpload}
            elementCmsBindingLoading={elementCmsBindingLoading}
            elementCmsBinding={elementCmsBinding}
            guestCmsTemplateRestricted={guestCmsTemplateRestricted}
            setAspectPreset={setAspectPreset}
            setCrop={setCrop}
            setCropFrameMode={setCropFrameMode}
            setFileBaseName={setFileBaseName}
            setHeightStr={setHeightStr}
            setOutputHeight={setOutputHeight}
            setOutputWidth={setOutputWidth}
            setPlacement={setPlacement}
            setQuality={setQuality}
            exportFormat={exportFormat}
            allowAvifEncoding={allowAvifEncoding}
            setExportFormat={setExportFormat}
            onExportFormatCommit={onQualityCommit}
            setReplaceLibraryAsset={setReplaceLibraryAsset}
            setSelectedAssetFolderId={setSelectedAssetFolderId}
            setSelectedComponentImagePropId={setSelectedComponentImagePropId}
            setWidthStr={setWidthStr}
            setZoom={setZoom}
            widthStr={widthStr}
            zoom={zoom}
            parsedExportWidth={parsedOutputW}
            parsedExportHeight={parsedOutputH}
            effectiveExportWidth={effectiveOutputW}
            effectiveExportHeight={effectiveOutputH}
            onOpenQualityPopout={openQualityPopout}
            limitCropZoomToNativeResolution={settings.limitCropZoomToNativeResolution}
          />
        </div>
      </div>
    ) : null;

  return (
    <ImageEditorWorkspace
      emptyStateContent={
        showGuestOnboarding ? (
          <ImageEditorOnboarding
            towerConfigured={towerConfigured}
            onSignInToTower={openTowerEmailSignInPopup}
            onContinueAsGuest={() => setGuestOnboardingComplete(true)}
          />
        ) : (
          <EmptyImageSourceSection
            dropZoneLabelClass={dropZoneLabelClass}
            fileInputId={fileInputId}
            handleDrag={handleDrag}
            handleDragState={handleDragState}
            handleDrop={handleDrop}
          />
        )
      }
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
