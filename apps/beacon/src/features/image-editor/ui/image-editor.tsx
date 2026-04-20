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
  findMatchingExportPresetId,
  resolvePresetExportFormat,
  resolvePresetExportQuality,
} from "@/features/image-editor/lib/export-preset";
import { useApplyCroppedToWebflow } from "@/features/image-editor/model/use-apply-cropped-to-webflow";
import { useCmsCollectionTemplatePage } from "@/features/image-editor/model/use-cms-collection-template-page";
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
  const [imageSrc, setImageSrcInternal] = useState<string | null>(null);
  const setImageSrc = useCallback((action: SetStateAction<string | null>) => {
    setExportPresetManualOverride(false);
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
  const showOnboardingLoading = !imageSrc && towerSessionPending && !towerUser && !guestOnboardingComplete;
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
    onOnboardingVisibilityChange?.(showOnboardingLoading || showGuestOnboarding);
  }, [onOnboardingVisibilityChange, showOnboardingLoading, showGuestOnboarding]);

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

  const exportPresetMatchId = useMemo(
    () =>
      findMatchingExportPresetId(
        isConfirmedGuest ? [] : settings.imagePresets,
        exportPresetDefaults,
        parsedOutputW,
        parsedOutputH,
        exportFormat,
        quality,
        formatForPresetMatch
      ),
    [
      isConfirmedGuest,
      settings.imagePresets,
      exportPresetDefaults,
      parsedOutputW,
      parsedOutputH,
      exportFormat,
      quality,
      formatForPresetMatch,
    ]
  );

  const exportPresetMatchActive = exportPresetMatchId !== null && !exportPresetManualOverride;

  const exportPresetEncodingSummary = useMemo(() => {
    if (!exportPresetMatchActive || !exportPresetMatchId) {
      return null;
    }
    const row = settings.imagePresets.find((p) => p.id === exportPresetMatchId);
    if (!row) {
      return null;
    }
    const f = resolvePresetExportFormat(row, exportPresetDefaults);
    const q = resolvePresetExportQuality(row, exportPresetDefaults);
    return `${row.name} · ${f.toUpperCase()} · ${Math.round(q * 100)}%`;
  }, [exportPresetMatchActive, exportPresetMatchId, settings.imagePresets, exportPresetDefaults]);

  const hideExportFieldsFromPreset = exportPresetMatchActive && exportPresetEncodingSummary !== null;

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
            exportPresetDefaults={exportPresetDefaults}
            onApplyExportPreset={applyExportPreset}
            onExportPresetChooseCustom={() => setExportPresetManualOverride(true)}
            exportPresetManualOverride={exportPresetManualOverride}
            hideExportFieldsFromPreset={hideExportFieldsFromPreset}
            exportPresetEncodingSummary={exportPresetEncodingSummary}
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
          />
        </div>
      </div>
    ) : null;

  return (
    <ImageEditorWorkspace
      emptyStateContent={
        showOnboardingLoading ? (
          <section
            className="mx-auto flex min-h-[560px] w-full max-w-md flex-col justify-center py-3"
            aria-live="polite"
          >
            <div className="flex flex-col items-center text-center">
              <h2 className="text-2xl font-semibold text-foreground">Welcome to Beacon</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Loading your start options…</p>
            </div>
          </section>
        ) : showGuestOnboarding ? (
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
