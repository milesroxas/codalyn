import { getVisibleBuiltinAspectPresets, type ImageExportFormat } from "@codalyn/webflow-kit";
import type { DragEvent, SetStateAction } from "react";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import { useNavigate } from "react-router-dom";
import {
  readBeaconGuestWelcomeComplete,
  writeBeaconGuestWelcomeComplete,
} from "@/features/auth/lib/beacon-guest-welcome-preference";
import { getTowerAuthBaseUrl, isTowerConfigured } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import type { PlacementMode } from "@/features/image-editor/lib/apply-cropped-export";
import { outputDimensionsMatchingCrop, parseOutputDimension } from "@/features/image-editor/lib/apply-cropped-export";
import { type AspectPreset, aspectValue } from "@/features/image-editor/lib/aspect-preset";
import { isCmsPrimaryUploadContext } from "@/features/image-editor/lib/cms-primary-upload-context";
import {
  type ExportDimensionInferenceSource,
  inferExportDimensionsForTarget,
} from "@/features/image-editor/lib/infer-image-target-dimensions";
import { openQualityComparePopout } from "@/features/image-editor/lib/open-quality-compare-popout";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { useApplyCroppedToWebflow } from "@/features/image-editor/model/use-apply-cropped-to-webflow";
import { useCmsCollectionTemplatePage } from "@/features/image-editor/model/use-cms-collection-template-page";
import { useComponentInstanceImageProps } from "@/features/image-editor/model/use-component-instance-image-props";
import { useExportByteEstimate } from "@/features/image-editor/model/use-export-byte-estimate";
import { useExportQualityPreview } from "@/features/image-editor/model/use-export-quality-preview";
import { useImageDissolveTransition } from "@/features/image-editor/model/use-image-dissolve-transition";
import { useImageEditorAssetFolders } from "@/features/image-editor/model/use-image-editor-asset-folders";
import { useImageEditorAutoTargets } from "@/features/image-editor/model/use-image-editor-auto-targets";
import { useImageEditorWorkflow } from "@/features/image-editor/model/use-image-editor-workflow";
import { useImageOutputDimensionsOnLoad } from "@/features/image-editor/model/use-image-output-dimensions-on-load";
import { useQualityPopoutBridge } from "@/features/image-editor/model/use-quality-popout-bridge";
import { useRevokeBlobUrlOnChange } from "@/features/image-editor/model/use-revoke-blob-url";
import {
  type CropFrameMode,
  ImageEditorCropExportPanel,
} from "@/features/image-editor/ui/image-editor-crop-export-panel";
import { ImageEditorLoadedColumn } from "@/features/image-editor/ui/image-editor-loaded-column";
import { ImageEditorOnboarding } from "@/features/image-editor/ui/image-editor-onboarding";
import { ImageEditorPreimageColumn } from "@/features/image-editor/ui/image-editor-preimage-column";
import { ImageEditorWorkspace } from "@/features/image-editor/ui/image-editor-workspace";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { cn } from "@/shared/lib/utils";

const TOWER_EMAIL_AUTH_POPUP_FEATURES = "popup=yes,width=540,height=780,scrollbars=yes,resizable=yes";

type ImageEditorProps = {
  onOnboardingVisibilityChange?: (visible: boolean) => void;
};

export function ImageEditor(props: ImageEditorProps = {}) {
  const { onOnboardingVisibilityChange } = props;
  const navigate = useNavigate();
  const { settings, updateSettings, canPersistExportDefaults, syncState, workspaceMemberRole, isTowerUser } =
    useBeaconAppSettings();
  const roleReady = useMemo(() => !isTowerUser || syncState === "synced", [isTowerUser, syncState]);
  const isWorkspaceDesigner = useMemo(
    () => Boolean(roleReady && workspaceMemberRole?.toLowerCase() === "designer"),
    [roleReady, workspaceMemberRole]
  );
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
  const [guestOnboardingComplete, setGuestOnboardingComplete] = useState(readBeaconGuestWelcomeComplete);
  const [imageSrc, setImageSrcInternal] = useState<string | null>(null);
  const setImageSrc = useCallback((action: SetStateAction<string | null>) => {
    setImageSrcInternal(action);
  }, []);
  const [autoPageTarget, setAutoPageTarget] = useState<ImagePageTarget | null>(null);
  const [autoExportInferenceSource, setAutoExportInferenceSource] = useState<ExportDimensionInferenceSource | null>(
    null
  );
  const [dismissedCanvasSelectionPrompt, setDismissedCanvasSelectionPrompt] = useState(false);
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
  const prevShowGuestOnboarding = useRef(false);

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

  useEffect(() => {
    if (towerUser && prevShowGuestOnboarding.current) {
      navigate("/home");
    }
    prevShowGuestOnboarding.current = showGuestOnboarding;
  }, [towerUser, showGuestOnboarding, navigate]);

  useRevokeBlobUrlOnChange(imageSrc);

  const parsedOutputW = useMemo(() => parseOutputDimension(widthStr, outputWidth), [widthStr, outputWidth]);
  const parsedOutputH = useMemo(() => parseOutputDimension(heightStr, outputHeight), [heightStr, outputHeight]);

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

  const exportPlaceBlockedLabel = null;

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

  const {
    pathMode,
    flowStep,
    setFlowStep,
    goToStep,
    chooseAutoPath,
    chooseConfigurePath,
    finishConfigurePath,
    exitToUploadFade,
    onExitToUploadTransitionEnd,
    beginAutoToUpload,
    frameSummary,
    currentStepForNav,
    showFlowStepNav,
    includeEntryStep,
  } = useImageEditorWorkflow({
    imageSrc,
    dissolving,
    showGuestOnboarding,
    setImageSrcInternal,
    setOriginalBytes,
    setCompletedCrop,
    setCrop,
    setZoom,
    aspectPreset,
    cropFrameMode,
    parsedOutputW,
    parsedOutputH,
    autoTargetLabel: autoPageTarget?.label ?? null,
    autoExportInferenceSource,
    isWorkspaceDesigner,
  });

  useLayoutEffect(() => {
    if (showGuestOnboarding) {
      return;
    }
    if (!roleReady) {
      return;
    }
    if (isWorkspaceDesigner) {
      return;
    }
    chooseAutoPath();
  }, [showGuestOnboarding, roleReady, isWorkspaceDesigner, chooseAutoPath]);

  useImageOutputDimensionsOnLoad(
    imageSrc,
    setOutputWidth,
    setOutputHeight,
    setWidthStr,
    setHeightStr,
    setCrop,
    setZoom,
    setCompletedCrop,
    setImageSrc,
    { applyNaturalImageDimensions: false }
  );

  const {
    targets: autoScanTargets,
    scanPending: autoScanPending,
    scanError: autoScanError,
    rescan: onAutoRescan,
    selectionHint: autoSelectionHint,
    discoverySettled: autoDiscoverySettled,
  } = useImageEditorAutoTargets({
    flowStep,
    pathMode,
    dismissedCanvasSelectionPrompt,
  });

  const applyAutoPageTarget = useCallback(
    async (t: ImagePageTarget) => {
      try {
        await webflow.setSelectedElement(t.element);
      } catch {
        /* selection may fail in edge cases */
      }
      if (t.kind === "component" && t.imagePropId != null) {
        setSelectedComponentImagePropId(t.imagePropId);
      }
      setPlacement(t.kind === "image" ? "replace" : "selection");
      setCropFrameMode("custom");
      const dims = await inferExportDimensionsForTarget(t);
      setAutoExportInferenceSource(dims.inferenceSource);
      setOutputWidth(dims.width);
      setOutputHeight(dims.height);
      setWidthStr(String(dims.width));
      setHeightStr(String(dims.height));
      setAspectPreset("free");
    },
    [setSelectedComponentImagePropId]
  );

  const onChooseAddImageEntry = useCallback(() => {
    setAutoPageTarget(null);
    setAutoExportInferenceSource(null);
    setDismissedCanvasSelectionPrompt(false);
    chooseAutoPath();
  }, [chooseAutoPath]);

  const onChooseConfigureEntry = useCallback(() => {
    setAutoPageTarget(null);
    setAutoExportInferenceSource(null);
    setDismissedCanvasSelectionPrompt(false);
    chooseConfigurePath();
  }, [chooseConfigurePath]);

  const onAutoSelectTarget = useCallback(
    (t: ImagePageTarget) => {
      setAutoPageTarget(t);
      void applyAutoPageTarget(t);
    },
    [applyAutoPageTarget]
  );

  const onAutoUseCanvasSelection = useCallback(() => {
    if (autoSelectionHint.kind === "none") {
      return;
    }
    const t =
      autoSelectionHint.kind === "image"
        ? autoSelectionHint.target
        : autoSelectionHint.kind === "component"
          ? autoSelectionHint.target
          : null;
    if (t) {
      setAutoPageTarget(t);
      void applyAutoPageTarget(t);
      beginAutoToUpload();
    }
  }, [autoSelectionHint, applyAutoPageTarget, beginAutoToUpload]);

  const onAutoChooseAnotherOnPage = useCallback(() => {
    setDismissedCanvasSelectionPrompt(true);
    setAutoPageTarget(null);
    setAutoExportInferenceSource(null);
  }, []);

  const autoShowSelectionChoice =
    pathMode === "auto" &&
    flowStep === "autoElement" &&
    autoDiscoverySettled &&
    !dismissedCanvasSelectionPrompt &&
    (autoSelectionHint.kind === "image" || autoSelectionHint.kind === "component");

  const showAutoPageTargetList = autoDiscoverySettled && !autoShowSelectionChoice;

  const exportPlaceBlockedLabelForApply = useMemo(() => {
    if (pathMode === "auto" && isConfirmedGuest && currentCmsItemId) {
      return "Sign in to Tower to place images in this collection";
    }
    return exportPlaceBlockedLabel;
  }, [pathMode, isConfirmedGuest, currentCmsItemId]);

  useEffect(() => {
    if (pathMode === "unset" && flowStep === "entry") {
      setAutoPageTarget(null);
      setAutoExportInferenceSource(null);
      setDismissedCanvasSelectionPrompt(false);
    }
  }, [pathMode, flowStep]);

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
    exportPlaceBlockedLabel: exportPlaceBlockedLabelForApply,
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
      <ImageEditorLoadedColumn
        busy={busy}
        currentStepForNav={currentStepForNav}
        fileBaseName={fileBaseName}
        fileInputRef={fileInputRef}
        flowStep={flowStep}
        goToStep={goToStep}
        includeEntryStep={includeEntryStep}
        pathMode={pathMode}
        showFlowStepNav={showFlowStepNav}
      >
        <ImageEditorCropExportPanel
          exportPlaceBlockedLabel={exportPlaceBlockedLabelForApply}
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
          flowPhase={pathMode === "auto" ? "position" : flowStep === "position" ? "position" : "save"}
          unifiedPositionAndSave={pathMode === "auto"}
          onContinueToSave={() => {
            setFlowStep("save");
          }}
          frameSummary={frameSummary}
        />
      </ImageEditorLoadedColumn>
    ) : null;

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <ImageEditorWorkspace
        emptyStateContent={
          showGuestOnboarding ? (
            <ImageEditorOnboarding
              towerConfigured={towerConfigured}
              onSignInToTower={openTowerEmailSignInPopup}
              onContinueAsGuest={() => {
                writeBeaconGuestWelcomeComplete();
                setGuestOnboardingComplete(true);
                navigate("/home");
              }}
            />
          ) : (
            <ImageEditorPreimageColumn
              autoScanError={autoScanError}
              autoScanPending={autoScanPending}
              autoSelectedTarget={autoPageTarget}
              autoSelectionHint={autoSelectionHint}
              autoDiscoverySettled={autoDiscoverySettled}
              autoShowPageTargetList={showAutoPageTargetList}
              autoShowSelectionChoice={autoShowSelectionChoice}
              autoTargets={autoScanTargets}
              beginAutoToUpload={beginAutoToUpload}
              currentStepForNav={currentStepForNav}
              dropZoneLabelClass={dropZoneLabelClass}
              exitToUploadFade={exitToUploadFade}
              fileInputId={fileInputId}
              onDoneConfiguringPresets={finishConfigurePath}
              flowStep={flowStep}
              goToStep={goToStep}
              handleDrag={handleDrag}
              handleDragState={handleDragState}
              handleDrop={handleDrop}
              includeEntryStep={includeEntryStep}
              isConfirmedGuest={isConfirmedGuest}
              isTowerUser={isTowerUser}
              isWorkspaceDesigner={isWorkspaceDesigner}
              onAutoChooseAnotherOnPage={onAutoChooseAnotherOnPage}
              onAutoRescan={onAutoRescan}
              onAutoSelectTarget={onAutoSelectTarget}
              onAutoUseCanvasSelection={onAutoUseCanvasSelection}
              onChooseAddImage={onChooseAddImageEntry}
              onChooseConfigure={onChooseConfigureEntry}
              onExitToUploadTransitionEnd={onExitToUploadTransitionEnd}
              pathMode={pathMode}
              roleReady={roleReady}
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
    </div>
  );
}
