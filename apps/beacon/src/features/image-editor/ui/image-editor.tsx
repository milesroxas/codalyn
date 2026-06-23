import {
  BEACON_IMAGE_ERROR_CODES,
  getVisibleBuiltinAspectPresets,
  type ImageExportFormat,
  type ResolvedUploadTarget,
} from "@codalyn/webflow-kit";
import { ArrowRight, Crop } from "lucide-react";
import type { DragEvent, ReactNode, SetStateAction } from "react";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import { useNavigate } from "react-router-dom";
import { useBeaconGuestWelcomeVisible } from "@/features/auth/lib/use-beacon-guest-welcome-visible";
import { isTowerConfigured } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerAccessPolicy } from "@/features/auth/model/use-beacon-tower-access-policy";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import type { ImageExportSuccessContext, PlacementMode } from "@/features/image-editor/lib/apply-cropped-export";
import {
  outputDimensionsMatchingCrop,
  parseOutputDimension,
  parseOutputDimensionStrict,
} from "@/features/image-editor/lib/apply-cropped-export";
import { aspectValue, type EditorAspectSelection } from "@/features/image-editor/lib/aspect-preset";
import {
  type ElementCmsBindingResolution,
  isCmsPrimaryUploadContext,
} from "@/features/image-editor/lib/cms-primary-upload-context";
import { dimensionsFromMaxWidthAndAspect } from "@/features/image-editor/lib/export-dimensions-from-aspect";
import { resolveDisplayedSurfaceTarget } from "@/features/image-editor/lib/image-editor-display-surface-target";
import {
  resolveEffectiveExportConstraints,
  resolveExportDimensionsReady,
} from "@/features/image-editor/lib/image-editor-export-dimensions-ready";
import {
  getImageEditorNavSteps,
  type ImageEditorFlowStep,
  type ImageEditorPathMode,
  imageEditorStepRestartHint,
  shouldShowImageEditorStepNav,
} from "@/features/image-editor/lib/image-editor-flow-step";
import {
  applyNaturalSizeSuggestionToSession,
  resolveImageEditorNaturalSizeAdvisory,
} from "@/features/image-editor/lib/image-editor-natural-size-advisory";
import { getImageEditorPlaceButtonState } from "@/features/image-editor/lib/image-editor-place-button-state";
import {
  shouldOfferReplacePlacement,
  shouldOfferSelectionPlacement,
} from "@/features/image-editor/lib/image-editor-placement-readiness";
import { resolveImageEditorPresetFileLimitBlocker } from "@/features/image-editor/lib/image-editor-preset-file-limit-blocker";
import { resolveImageEditorPlacement } from "@/features/image-editor/lib/image-editor-resolved-placement";
import { mapSelectedTargetToResolvedUploadTarget } from "@/features/image-editor/lib/image-editor-resolved-target";
import { resolveSessionResolvedConstraintsApplication } from "@/features/image-editor/lib/image-editor-session-resolved-constraints";
import {
  buildUploadPresetPickerOptions,
  isManualUploadPresetOptionId,
  isUploadPresetExportFormatLocked,
  resolveAutoUploadPresetOptionId,
  resolveShowExportSizeControls,
} from "@/features/image-editor/lib/image-editor-upload-preset-picker";
import { loadImage } from "@/features/image-editor/lib/load-image";
import { openQualityComparePopout } from "@/features/image-editor/lib/open-quality-compare-popout";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import {
  isAvifPresetOverriddenByTowerLimit,
  resolveEffectiveExportFormat,
} from "@/features/image-editor/lib/tower-avif-export-format";
import { webflowElementIdKey } from "@/features/image-editor/lib/webflow-element-id-key";
import { useApplyCroppedToWebflow } from "@/features/image-editor/model/use-apply-cropped-to-webflow";
import { useComponentInstanceImageProps } from "@/features/image-editor/model/use-component-instance-image-props";
import { useExportByteEstimate } from "@/features/image-editor/model/use-export-byte-estimate";
import { useExportQualityPreview } from "@/features/image-editor/model/use-export-quality-preview";
import { useImageDissolveTransition } from "@/features/image-editor/model/use-image-dissolve-transition";
import { useImageEditorAssetFolders } from "@/features/image-editor/model/use-image-editor-asset-folders";
import { useImageEditorAutoTargets } from "@/features/image-editor/model/use-image-editor-auto-targets";
import {
  type ImageEditorComposeSession,
  useImageEditorComposeMode,
} from "@/features/image-editor/model/use-image-editor-compose-mode";
import { useImageEditorExportSuccessNavigation } from "@/features/image-editor/model/use-image-editor-export-success-navigation";
import { useImageEditorWorkflow } from "@/features/image-editor/model/use-image-editor-workflow";
import { useImageOutputDimensionsOnLoad } from "@/features/image-editor/model/use-image-output-dimensions-on-load";
import { useQualityPopoutBridge } from "@/features/image-editor/model/use-quality-popout-bridge";
import { useResolvedExportConstraints } from "@/features/image-editor/model/use-resolved-export-constraints";
import { useRevokeBlobUrlOnChange } from "@/features/image-editor/model/use-revoke-blob-url";
import { useTowerUsageLimitDialog } from "@/features/image-editor/model/use-tower-usage-limit-dialog";
import type {
  CropFrameMode,
  UploadPresetPickerOption,
} from "@/features/image-editor/ui/image-editor-crop-export-panel";
import { ImageEditorLoadedEditor } from "@/features/image-editor/ui/image-editor-loaded-editor";
import { ImageEditorOnboarding } from "@/features/image-editor/ui/image-editor-onboarding";
import { ImageEditorPreimageColumn } from "@/features/image-editor/ui/image-editor-preimage-column";
import {
  ImageEditorRouteChrome,
  ImageEditorRouteFooterAction,
} from "@/features/image-editor/ui/image-editor-route-chrome";
import { ImageEditorWorkspace } from "@/features/image-editor/ui/image-editor-workspace";
import { TowerUsageLimitDialog } from "@/features/image-editor/ui/tower-usage-limit-dialog";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import {
  IMAGE_UPLOAD_CONTINUE_TO_ADD_LABEL,
  IMAGE_UPLOAD_CONTINUE_TO_SAVE_LABEL,
} from "@/shared/lib/beacon-feature-route-copy";
import type { TowerUsageLimitDetails } from "@/shared/lib/tower-usage-limit-error";
import { useCmsCollectionTemplatePage } from "@/shared/lib/use-cms-collection-template-page";
import { useDesignerCurrentPageId } from "@/shared/lib/use-designer-current-page-id";
import { StepNav } from "@/shared/ui/step-nav";

function hasAutoCanvasImageTarget(
  pathMode: string,
  flowStep: string,
  autoDiscoverySettled: boolean,
  autoSelectionHintKind: string
): boolean {
  return (
    pathMode === "auto" &&
    flowStep === "autoElement" &&
    autoDiscoverySettled &&
    (autoSelectionHintKind === "image" || autoSelectionHintKind === "component")
  );
}

function buildResolvedTargetInput(options: {
  siteId: string;
  pageId: string;
  autoPageTarget: ImagePageTarget | null;
  selectedElement: AnyElement | null;
  selectedComponentImagePropId: string | null;
  elementCmsBinding: ElementCmsBindingResolution;
}): Parameters<typeof mapSelectedTargetToResolvedUploadTarget>[0] {
  const { siteId, pageId, autoPageTarget, selectedElement, selectedComponentImagePropId, elementCmsBinding } = options;
  return {
    siteId,
    pageId,
    autoPageTarget,
    selectedElement: autoPageTarget == null ? selectedElement : null,
    selectedComponentImagePropId:
      autoPageTarget?.kind === "component"
        ? (autoPageTarget.imagePropId ?? selectedComponentImagePropId)
        : selectedComponentImagePropId,
    elementCmsBinding: autoPageTarget == null ? elementCmsBinding : "none",
  };
}

function resolvedTargetInputKey(input: Parameters<typeof mapSelectedTargetToResolvedUploadTarget>[0]): string {
  const base = `${input.siteId}:${input.pageId}`;
  if (input.autoPageTarget != null) {
    return `${base}:${input.autoPageTarget.kind}:${webflowElementIdKey(input.autoPageTarget.element)}:${input.autoPageTarget.imagePropId ?? "none"}`;
  }
  return `${base}:${input.selectedElement ? webflowElementIdKey(input.selectedElement) : "none"}:${input.selectedComponentImagePropId ?? "none"}:${input.elementCmsBinding}`;
}

function imageEditorRouteChromeSlots(options: {
  showFlowStepNav: boolean;
  currentStepForNav: ImageEditorFlowStep;
  imageSrc: string | null;
  pathMode: ImageEditorPathMode;
  composeActive: boolean;
  goToStep: (step: ImageEditorFlowStep) => void;
  showGuestOnboarding: boolean;
  flowStep: ImageEditorFlowStep;
  autoDiscoverySettled: boolean;
  autoPageTarget: ImagePageTarget | null;
  beginAutoToUpload: () => void;
  beginPositionToSave: () => void;
  continueToSaveDisabled: boolean;
  stepExitFade: boolean;
  savePlaceAction: { label: string; disabled: boolean; busy: boolean; onPlace: () => void } | null;
  configurePresetsFooter: ReactNode | null;
}): { subheader?: ReactNode; footer?: ReactNode } {
  const {
    showFlowStepNav,
    currentStepForNav,
    imageSrc,
    pathMode,
    goToStep,
    showGuestOnboarding,
    flowStep,
    autoDiscoverySettled,
    autoPageTarget,
    beginAutoToUpload,
    beginPositionToSave,
    continueToSaveDisabled,
    stepExitFade,
    savePlaceAction,
    configurePresetsFooter,
    composeActive,
  } = options;

  const subheader =
    !showGuestOnboarding &&
    flowStep !== "configurePresets" &&
    showFlowStepNav &&
    flowStep !== "success" &&
    shouldShowImageEditorStepNav(pathMode) ? (
      <StepNav
        aria-label="Image editor steps"
        current={currentStepForNav}
        onStepSelect={goToStep}
        steps={getImageEditorNavSteps(pathMode, { includeTarget: !composeActive }).map((step) => ({
          id: step.id,
          label: step.label,
          restartHint: imageEditorStepRestartHint(step.id, imageSrc != null),
        }))}
      />
    ) : null;

  const footer = resolveImageEditorRouteFooter({
    showGuestOnboarding,
    flowStep,
    autoDiscoverySettled,
    imageSrc,
    autoPageTarget,
    stepExitFade,
    beginAutoToUpload,
    continueToSaveDisabled,
    beginPositionToSave,
    savePlaceAction,
    configurePresetsFooter,
  });

  return { subheader, footer };
}

function resolveImageEditorRouteFooter(options: {
  showGuestOnboarding: boolean;
  flowStep: ImageEditorFlowStep;
  autoDiscoverySettled: boolean;
  imageSrc: string | null;
  autoPageTarget: ImagePageTarget | null;
  stepExitFade: boolean;
  beginAutoToUpload: () => void;
  continueToSaveDisabled: boolean;
  beginPositionToSave: () => void;
  savePlaceAction: { label: string; disabled: boolean; busy: boolean; onPlace: () => void } | null;
  configurePresetsFooter: ReactNode | null;
}): ReactNode | undefined {
  const {
    showGuestOnboarding,
    flowStep,
    autoDiscoverySettled,
    imageSrc,
    autoPageTarget,
    stepExitFade,
    beginAutoToUpload,
    continueToSaveDisabled,
    beginPositionToSave,
    savePlaceAction,
    configurePresetsFooter,
  } = options;

  if (showGuestOnboarding) {
    return undefined;
  }
  if (flowStep === "success") {
    return undefined;
  }
  if (flowStep === "configurePresets") {
    return configurePresetsFooter ?? undefined;
  }
  if (flowStep === "autoElement" && autoDiscoverySettled && imageSrc == null && autoPageTarget != null) {
    return (
      <ImageEditorRouteFooterAction
        label={IMAGE_UPLOAD_CONTINUE_TO_ADD_LABEL}
        disabled={stepExitFade}
        onAction={beginAutoToUpload}
        trailingIcon={<ArrowRight aria-hidden strokeWidth={2.25} />}
      />
    );
  }
  if (flowStep === "position" && imageSrc != null) {
    return (
      <ImageEditorRouteFooterAction
        label={IMAGE_UPLOAD_CONTINUE_TO_SAVE_LABEL}
        disabled={continueToSaveDisabled || stepExitFade}
        onAction={beginPositionToSave}
        trailingIcon={<ArrowRight aria-hidden strokeWidth={2.25} />}
      />
    );
  }
  if (flowStep === "save" && imageSrc != null && savePlaceAction) {
    return (
      <ImageEditorRouteFooterAction
        label={savePlaceAction.label}
        disabled={savePlaceAction.disabled}
        busy={savePlaceAction.busy}
        onAction={savePlaceAction.onPlace}
        trailingIcon={<Crop aria-hidden strokeWidth={2.25} />}
      />
    );
  }
  return undefined;
}

type SessionConstraintSetters = {
  setOutputWidth: (value: number) => void;
  setOutputHeight: (value: number) => void;
  setWidthStr: (value: string) => void;
  setHeightStr: (value: string) => void;
  setExportFormat: (value: ImageExportFormat) => void;
  setQuality: (value: number) => void;
  setCropFrameMode: (value: CropFrameMode) => void;
  setAspectPreset: (value: EditorAspectSelection) => void;
};

function applySessionConstraintsFromPickerSelection(
  constraints: NonNullable<ReturnType<typeof resolveSessionResolvedConstraintsApplication>["constraints"]>,
  setters: SessionConstraintSetters
) {
  setters.setOutputWidth(constraints.width);
  setters.setOutputHeight(constraints.height);
  setters.setWidthStr(String(constraints.width));
  setters.setHeightStr(String(constraints.height));
  setters.setExportFormat(constraints.exportFormat);
  setters.setQuality(constraints.quality);
  setters.setCropFrameMode("custom");
  setters.setAspectPreset("free");
}

// Debug-only readout: tree-shaken out of production builds via import.meta.env.DEV.
function shouldShowResolvedReadout(composeActive: boolean): boolean {
  return import.meta.env.DEV && !composeActive;
}

export function ImageEditor({ composeSession }: { composeSession?: ImageEditorComposeSession } = {}) {
  const compose = useImageEditorComposeMode(composeSession);
  const navigate = useNavigate();
  const {
    settings,
    updateSettings,
    canPersistExportDefaults,
    settingsPullSettled,
    settingsPullSynced,
    isTowerUser,
    editorExperience,
    canManageTeamBeaconSettings,
  } = useBeaconAppSettings();
  const roleReady = settingsPullSettled;
  /** Designers and admins in designer view (not editor-style mode) see the entry step. */
  const isWorkspaceDesigner = useMemo(
    () => Boolean(roleReady && isTowerUser && !editorExperience),
    [roleReady, isTowerUser, editorExperience]
  );
  const baseId = useId();
  const fileInputId = `${baseId}-file`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectPreset, setAspectPreset] = useState<EditorAspectSelection>("unset");
  const [cropFrameMode, setCropFrameMode] = useState<CropFrameMode>("aspect");
  const [completedCrop, setCompletedCrop] = useState<Area | null>(null);
  const [outputWidth, setOutputWidth] = useState(0);
  const [outputHeight, setOutputHeight] = useState(0);
  const [widthStr, setWidthStr] = useState("");
  const [heightStr, setHeightStr] = useState("");
  const [sourceNaturalSize, setSourceNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [dismissedNaturalSizeAdvisoryKey, setDismissedNaturalSizeAdvisoryKey] = useState<string | null>(null);
  const [fileBaseName, setFileBaseName] = useState("edited");
  const [altText, setAltText] = useState("");
  const [quality, setQuality] = useState(settings.defaultExportQuality);
  const [exportFormat, setExportFormat] = useState<ImageExportFormat>(settings.defaultExportFormat);
  const [sessionMaxFileSizeBytes, setSessionMaxFileSizeBytes] = useState<number | null>(null);
  const [placement, setPlacement] = useState<PlacementMode>("library");
  const [replaceLibraryAsset, setReplaceLibraryAsset] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [originalBytes, setOriginalBytes] = useState<number | null>(null);
  const { visible: guestWelcomeVisible, chooseGuest } = useBeaconGuestWelcomeVisible();
  const [imageSrc, setImageSrcInternal] = useState<string | null>(null);
  const setImageSrc = useCallback((action: SetStateAction<string | null>) => {
    setImageSrcInternal(action);
  }, []);
  const [autoPageTarget, setAutoPageTarget] = useState<ImagePageTarget | null>(null);
  const [autoTargetHasDesignerExportTag, setAutoTargetHasDesignerExportTag] = useState(false);
  const { user: towerUser, isPending: towerSessionPending } = useBeaconTowerSession();
  const exportDefaultsHydratedRef = useRef(!towerUser?.id);
  const serverExportDefaultsAppliedRef = useRef(false);
  const towerConfigured = isTowerConfigured();
  const { earlyAccessRequired } = useBeaconTowerAccessPolicy();
  const allowAvifEncoding = Boolean(towerUser);
  const isConfirmedGuest = !towerUser && !towerSessionPending;
  const { isCmsCollectionTemplatePage: cmsCollectionTemplatePage } = useCmsCollectionTemplatePage();
  const guestCmsTemplateRestricted = isConfirmedGuest && cmsCollectionTemplatePage;
  /** Guest onboarding only after Tower session resolves; while pending, show the empty drop zone (no loading interstitial). */
  const showGuestOnboarding = !imageSrc && guestWelcomeVisible;
  const prevShowGuestOnboarding = useRef(false);
  const [resolverSiteId, setResolverSiteId] = useState<string | null>(null);
  const { pageId: resolverPageId } = useDesignerCurrentPageId();
  const [resolvedUploadTarget, setResolvedUploadTarget] = useState<ResolvedUploadTarget | null>(null);
  const [configurePresetsFooter, setConfigurePresetsFooter] = useState<ReactNode | null>(null);
  const [configurePresetsScrollResetKey, setConfigurePresetsScrollResetKey] = useState<string | null>(null);
  const lastResolvedTargetInputKeyRef = useRef<string | null>(null);
  const resolvedTargetForInputKeyRef = useRef<string | null>(null);
  const lastUploadPresetTargetInputKeyRef = useRef<string | null>(null);
  const userPickedUploadPresetRef = useRef(false);
  const lastAppliedUploadPresetOptionIdRef = useRef<string | null>(null);
  const lastAppliedResolverConstraintsKeyRef = useRef<string | null>(null);
  const skipNextPersistExportDefaultsRef = useRef(false);
  const [uploadPresetOptionId, setUploadPresetOptionId] = useState<string>("");
  const {
    open: usageLimitDialogOpen,
    details: usageLimitDialogDetails,
    imageOptimizeLimitReached,
    reportUsageLimit,
    onOpenChange: onUsageLimitDialogOpenChange,
  } = useTowerUsageLimitDialog();

  const reportTowerUsageLimit = useCallback(
    (details: TowerUsageLimitDetails) => {
      reportUsageLimit(details);
      if (details.kind === "image") {
        setExportFormat("webp");
      }
    },
    [reportUsageLimit]
  );

  const handleUploadPresetPickerChange = useCallback((value: string) => {
    userPickedUploadPresetRef.current = true;
    setUploadPresetOptionId(value);
  }, []);

  const {
    assetFolders,
    foldersLoading,
    folderActionBusy,
    selectedAssetFolderId,
    setSelectedAssetFolderId,
    createAssetFolderNamed,
  } = useImageEditorAssetFolders(imageSrc);

  const {
    selectedElement,
    componentImageProps,
    selectedComponentImagePropId,
    setSelectedComponentImagePropId,
    selectedElementType,
    currentCmsItemId,
    componentImagePropsResolving,
    elementCmsBinding,
    elementCmsBindingLoading,
  } = useComponentInstanceImageProps();

  useEffect(() => {
    let cancelled = false;
    void webflow
      .getSiteInfo()
      .then((site) => {
        if (!cancelled) {
          setResolverSiteId(site.siteId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolverSiteId(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolverTargetInput = useMemo(() => {
    if (compose.active || resolverSiteId == null || resolverPageId == null || imageSrc == null) {
      return null;
    }
    return buildResolvedTargetInput({
      siteId: resolverSiteId,
      pageId: resolverPageId,
      autoPageTarget,
      selectedElement,
      selectedComponentImagePropId,
      elementCmsBinding,
    });
  }, [
    compose.active,
    resolverSiteId,
    resolverPageId,
    autoPageTarget,
    selectedElement,
    selectedComponentImagePropId,
    elementCmsBinding,
    imageSrc,
  ]);

  useEffect(() => {
    if (resolverTargetInput == null) {
      lastResolvedTargetInputKeyRef.current = null;
      resolvedTargetForInputKeyRef.current = null;
      setResolvedUploadTarget(null);
      return;
    }
    const inputKey = resolvedTargetInputKey(resolverTargetInput);
    if (lastResolvedTargetInputKeyRef.current === inputKey) {
      return;
    }
    lastResolvedTargetInputKeyRef.current = inputKey;
    resolvedTargetForInputKeyRef.current = null;
    setResolvedUploadTarget(null);
    let cancelled = false;
    void mapSelectedTargetToResolvedUploadTarget(resolverTargetInput).then((target) => {
      if (!cancelled) {
        setResolvedUploadTarget(target);
        resolvedTargetForInputKeyRef.current = inputKey;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [resolverTargetInput]);

  const resolvedConstraintsReadout = useResolvedExportConstraints({
    enabled: true,
    settings,
    target: resolvedUploadTarget,
  });

  const uploadPresetPickerStateOptions = useMemo(
    () =>
      buildUploadPresetPickerOptions({
        enabled: true,
        settings,
        target: resolvedUploadTarget,
        readout: resolvedConstraintsReadout,
        allowTeamPresets: !isConfirmedGuest,
      }),
    [settings, resolvedUploadTarget, resolvedConstraintsReadout, isConfirmedGuest]
  );

  const uploadPresetPickerOptions = useMemo<UploadPresetPickerOption[]>(
    () =>
      uploadPresetPickerStateOptions.map((option) => ({
        id: option.id,
        label: option.label,
      })),
    [uploadPresetPickerStateOptions]
  );

  const uploadPresetPickerOptionMap = useMemo(
    () => new Map(uploadPresetPickerStateOptions.map((option) => [option.id, option])),
    [uploadPresetPickerStateOptions]
  );

  const uploadPresetExportFormatLocked = useMemo(
    () => isUploadPresetExportFormatLocked(uploadPresetPickerOptionMap.get(uploadPresetOptionId)),
    [uploadPresetOptionId, uploadPresetPickerOptionMap]
  );

  const selectedUploadPresetConstraints = uploadPresetPickerOptionMap.get(uploadPresetOptionId)?.constraints ?? null;

  const effectiveExportFormat = useMemo(
    () => resolveEffectiveExportFormat(exportFormat, imageOptimizeLimitReached),
    [exportFormat, imageOptimizeLimitReached]
  );

  const avifPresetOverriddenByTowerLimit = useMemo(
    () =>
      isAvifPresetOverriddenByTowerLimit({
        imageOptimizeLimitReached,
        presetExportFormat: selectedUploadPresetConstraints?.exportFormat,
      }),
    [selectedUploadPresetConstraints?.exportFormat, imageOptimizeLimitReached]
  );

  const uploadPresetPickerReadOnly = useMemo(
    () => Boolean(isTowerUser && editorExperience && !canManageTeamBeaconSettings),
    [isTowerUser, editorExperience, canManageTeamBeaconSettings]
  );

  const uploadPresetPickerVisible = useMemo(
    () => !compose.active && uploadPresetPickerOptions.length > 0 && !editorExperience,
    [compose.active, uploadPresetPickerOptions.length, editorExperience]
  );

  const uploadPresetManualOverride = useMemo(
    () => isManualUploadPresetOptionId(uploadPresetOptionId),
    [uploadPresetOptionId]
  );

  const effectiveTaggedDimensionsActive = autoTargetHasDesignerExportTag && !uploadPresetManualOverride;

  const effectiveExportConstraints = useMemo(
    () =>
      resolveEffectiveExportConstraints({
        composeConstraints: compose.constraints,
        uploadPresetManualOverride,
        selectedPresetConstraints: selectedUploadPresetConstraints,
        resolvedReadout: resolvedConstraintsReadout,
      }),
    [compose.constraints, uploadPresetManualOverride, selectedUploadPresetConstraints, resolvedConstraintsReadout]
  );

  const showExportSizeControls = useMemo(
    () =>
      resolveShowExportSizeControls({
        effectiveTaggedDimensionsActive,
        effectiveExportConstraints,
      }),
    [effectiveTaggedDimensionsActive, effectiveExportConstraints]
  );

  useEffect(() => {
    if (imageSrc == null) {
      setUploadPresetOptionId("");
      lastAppliedUploadPresetOptionIdRef.current = null;
      lastAppliedResolverConstraintsKeyRef.current = null;
      userPickedUploadPresetRef.current = false;
      lastUploadPresetTargetInputKeyRef.current = null;
      return;
    }
    const targetInputKey = resolverTargetInput != null ? resolvedTargetInputKey(resolverTargetInput) : null;
    const targetResolutionSettled =
      resolverTargetInput == null || resolvedTargetForInputKeyRef.current === targetInputKey;
    if (targetInputKey !== lastUploadPresetTargetInputKeyRef.current) {
      lastUploadPresetTargetInputKeyRef.current = targetInputKey;
      userPickedUploadPresetRef.current = false;
    }
    const nextOptionId = resolveAutoUploadPresetOptionId({
      currentOptionId: uploadPresetOptionId,
      userPicked: userPickedUploadPresetRef.current,
      readout: resolvedConstraintsReadout,
      availableOptionIds: new Set(uploadPresetPickerOptionMap.keys()),
      targetResolutionSettled,
    });
    if (nextOptionId != null && nextOptionId !== uploadPresetOptionId) {
      setUploadPresetOptionId(nextOptionId);
    }
  }, [imageSrc, resolverTargetInput, resolvedConstraintsReadout, uploadPresetPickerOptionMap, uploadPresetOptionId]);

  const visibleBuiltinAspectPresets = useMemo(() => getVisibleBuiltinAspectPresets(settings), [settings]);

  const useManualAspectAndMaxWidth = !effectiveTaggedDimensionsActive;

  const aspectPresetsForCrop = useMemo(() => {
    if (useManualAspectAndMaxWidth) {
      const withoutFree = visibleBuiltinAspectPresets.filter((p) => p !== "free");
      return withoutFree.length > 0 ? withoutFree : visibleBuiltinAspectPresets;
    }
    return visibleBuiltinAspectPresets;
  }, [useManualAspectAndMaxWidth, visibleBuiltinAspectPresets]);

  const autoTargetExportSizeLabel = useMemo((): "tag" | "manual" | null => {
    if (autoPageTarget == null) {
      return null;
    }
    return autoTargetHasDesignerExportTag && !uploadPresetManualOverride ? "tag" : "manual";
  }, [autoPageTarget, autoTargetHasDesignerExportTag, uploadPresetManualOverride]);

  const widthStrRef = useRef(widthStr);
  widthStrRef.current = widthStr;
  const outputWidthRef = useRef(outputWidth);
  outputWidthRef.current = outputWidth;

  useEffect(() => {
    if (visibleBuiltinAspectPresets.length === 0) {
      return;
    }
    if (aspectPreset === "unset") {
      return;
    }
    if (!visibleBuiltinAspectPresets.includes(aspectPreset as (typeof visibleBuiltinAspectPresets)[number])) {
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
        elementCmsBindingLoading,
        componentImagePropsResolving,
        componentImageProps,
        selectedComponentImagePropId,
      }),
    [
      currentCmsItemId,
      placement,
      selectedElementType,
      elementCmsBinding,
      elementCmsBindingLoading,
      componentImagePropsResolving,
      componentImageProps,
      selectedComponentImagePropId,
    ]
  );

  const effectivePlacement = useMemo<PlacementMode>(
    () => (compose.active ? "compose" : placement),
    [compose.active, placement]
  );
  const effectiveCmsPrimaryUpload = useMemo(
    () => (compose.active ? true : cmsPrimaryUpload),
    [compose.active, cmsPrimaryUpload]
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
  } = useImageDissolveTransition({ setImageSrc, setOriginalBytes, setFileBaseName, setAltText });

  useEffect(() => {
    exportDefaultsHydratedRef.current = !towerUser?.id;
    serverExportDefaultsAppliedRef.current = false;
  }, [towerUser?.id]);

  useEffect(() => {
    if (!towerUser?.id || !settingsPullSynced || serverExportDefaultsAppliedRef.current) {
      return;
    }
    serverExportDefaultsAppliedRef.current = true;
    setExportFormat(settings.defaultExportFormat);
    setQuality(settings.defaultExportQuality);
    exportDefaultsHydratedRef.current = true;
  }, [towerUser?.id, settingsPullSynced, settings]);

  useEffect(() => {
    if (compose.active) {
      return;
    }
    if (skipNextPersistExportDefaultsRef.current) {
      skipNextPersistExportDefaultsRef.current = false;
      return;
    }
    if (!exportDefaultsHydratedRef.current || !canPersistExportDefaults) {
      return;
    }
    updateSettings({
      defaultExportFormat: exportFormat,
      defaultExportQuality: quality,
    });
  }, [compose.active, exportFormat, quality, canPersistExportDefaults, updateSettings]);

  const sessionConstraintApplication = useMemo(
    () =>
      resolveSessionResolvedConstraintsApplication({
        enabled: true,
        imageSrc,
        readout: resolvedConstraintsReadout,
      }),
    [imageSrc, resolvedConstraintsReadout]
  );

  useEffect(() => {
    setAutoTargetHasDesignerExportTag(sessionConstraintApplication.taggedDimensionsActive);
  }, [sessionConstraintApplication.taggedDimensionsActive]);

  useEffect(() => {
    if (compose.active || imageSrc == null) {
      return;
    }
    if (!sessionConstraintApplication.shouldApply || uploadPresetManualOverride) {
      return;
    }
    const constraints = sessionConstraintApplication.constraints;
    if (constraints == null) {
      return;
    }
    const applyKey = JSON.stringify({
      target: resolvedUploadTarget,
      source: sessionConstraintApplication.source,
      presetId: resolvedConstraintsReadout?.presetId ?? null,
      constraints,
      imageSrc,
    });
    if (lastAppliedResolverConstraintsKeyRef.current === applyKey) {
      return;
    }
    lastAppliedResolverConstraintsKeyRef.current = applyKey;
    skipNextPersistExportDefaultsRef.current = true;
    applySessionConstraintsFromPickerSelection(
      {
        ...constraints,
        exportFormat: resolveEffectiveExportFormat(constraints.exportFormat, imageOptimizeLimitReached),
      },
      {
        setOutputWidth,
        setOutputHeight,
        setWidthStr,
        setHeightStr,
        setExportFormat,
        setQuality,
        setCropFrameMode,
        setAspectPreset,
      }
    );
  }, [
    compose.active,
    imageSrc,
    sessionConstraintApplication,
    uploadPresetManualOverride,
    resolvedUploadTarget,
    resolvedConstraintsReadout,
    imageOptimizeLimitReached,
  ]);

  useEffect(() => {
    if (compose.active) {
      return;
    }
    const selectedOption = uploadPresetPickerOptionMap.get(uploadPresetOptionId) ?? null;
    const selectedConstraints = selectedOption?.constraints ?? null;
    if (selectedOption == null || isManualUploadPresetOptionId(selectedOption.id)) {
      setSessionMaxFileSizeBytes(null);
      lastAppliedUploadPresetOptionIdRef.current = null;
      return;
    }
    setSessionMaxFileSizeBytes(selectedConstraints?.maxFileSizeBytes ?? null);
    if (selectedConstraints == null) {
      return;
    }
    const applyKey = JSON.stringify({
      target: resolvedUploadTarget,
      selectedOptionId: selectedOption.id,
      constraints: selectedConstraints,
      imageSrc,
    });
    if (lastAppliedUploadPresetOptionIdRef.current === applyKey) {
      return;
    }
    lastAppliedUploadPresetOptionIdRef.current = applyKey;
    skipNextPersistExportDefaultsRef.current = true;
    applySessionConstraintsFromPickerSelection(
      {
        ...selectedConstraints,
        exportFormat: resolveEffectiveExportFormat(selectedConstraints.exportFormat, imageOptimizeLimitReached),
      },
      {
        setOutputWidth,
        setOutputHeight,
        setWidthStr,
        setHeightStr,
        setExportFormat,
        setQuality,
        setCropFrameMode,
        setAspectPreset,
      }
    );
  }, [
    compose.active,
    resolvedUploadTarget,
    uploadPresetOptionId,
    uploadPresetPickerOptionMap,
    imageSrc,
    imageOptimizeLimitReached,
  ]);

  // Compose mode: drive the session straight from the Designer per-prop preset (highest precedence, locks the UI).
  useEffect(() => {
    if (!compose.active || imageSrc == null || compose.constraints == null) {
      return;
    }
    setSessionMaxFileSizeBytes(compose.constraints.maxFileSizeBytes);
    skipNextPersistExportDefaultsRef.current = true;
    applySessionConstraintsFromPickerSelection(
      {
        ...compose.constraints,
        exportFormat: resolveEffectiveExportFormat(compose.constraints.exportFormat, imageOptimizeLimitReached),
      },
      {
        setOutputWidth,
        setOutputHeight,
        setWidthStr,
        setHeightStr,
        setExportFormat,
        setQuality,
        setCropFrameMode,
        setAspectPreset,
      }
    );
  }, [compose.active, compose.constraints, imageSrc, imageOptimizeLimitReached]);

  useEffect(() => {
    if (uploadPresetExportFormatLocked && !avifPresetOverriddenByTowerLimit) {
      return;
    }
    if ((!allowAvifEncoding || imageOptimizeLimitReached) && exportFormat === "avif") {
      setExportFormat("webp");
    }
  }, [
    allowAvifEncoding,
    avifPresetOverriddenByTowerLimit,
    exportFormat,
    uploadPresetExportFormatLocked,
    imageOptimizeLimitReached,
  ]);

  useEffect(() => {
    if (!compose.active && towerUser && prevShowGuestOnboarding.current) {
      navigate("/home");
    }
    prevShowGuestOnboarding.current = showGuestOnboarding;
  }, [compose.active, towerUser, showGuestOnboarding, navigate]);

  useRevokeBlobUrlOnChange(imageSrc);

  useEffect(() => {
    if (imageSrc == null) {
      setSourceNaturalSize(null);
      return;
    }
    let cancelled = false;
    void loadImage(imageSrc)
      .then((img) => {
        if (cancelled) {
          return;
        }
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setSourceNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
          return;
        }
        setSourceNaturalSize(null);
      })
      .catch(() => {
        if (!cancelled) {
          setSourceNaturalSize(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [imageSrc]);

  const parsedOutputW = useMemo(() => {
    if (effectiveTaggedDimensionsActive) {
      return parseOutputDimension(widthStr, outputWidth);
    }
    return parseOutputDimensionStrict(widthStr) ?? 0;
  }, [widthStr, outputWidth, effectiveTaggedDimensionsActive]);

  const parsedOutputH = useMemo(() => {
    if (effectiveTaggedDimensionsActive) {
      return parseOutputDimension(heightStr, outputHeight);
    }
    return parseOutputDimensionStrict(heightStr) ?? 0;
  }, [heightStr, outputHeight, effectiveTaggedDimensionsActive]);

  const { effectiveOutputW, effectiveOutputH } = useMemo(() => {
    if (!completedCrop) {
      return { effectiveOutputW: parsedOutputW, effectiveOutputH: parsedOutputH };
    }
    const { width, height } = outputDimensionsMatchingCrop(completedCrop, parsedOutputW, parsedOutputH);
    return { effectiveOutputW: width, effectiveOutputH: height };
  }, [completedCrop, parsedOutputW, parsedOutputH]);

  const advisoryComparisonSize = useMemo(() => {
    const resolved = resolvedConstraintsReadout?.constraints;
    if (resolved != null) {
      return { width: resolved.width, height: resolved.height };
    }
    if (parsedOutputW > 0 && parsedOutputH > 0) {
      return { width: parsedOutputW, height: parsedOutputH };
    }
    return null;
  }, [resolvedConstraintsReadout, parsedOutputW, parsedOutputH]);

  const naturalSizeAdvisoryKey = useMemo(() => {
    if (imageSrc == null || sourceNaturalSize == null || advisoryComparisonSize == null) {
      return null;
    }
    return JSON.stringify({
      imageSrc,
      natural: sourceNaturalSize,
      comparison: advisoryComparisonSize,
      source: resolvedConstraintsReadout?.source ?? "manual",
      targetKind: resolvedUploadTarget?.kind ?? "manual",
    });
  }, [imageSrc, sourceNaturalSize, advisoryComparisonSize, resolvedConstraintsReadout, resolvedUploadTarget]);

  const naturalSizeAdvisory = useMemo(
    () =>
      resolveImageEditorNaturalSizeAdvisory({
        enabled: imageSrc != null,
        dismissed: naturalSizeAdvisoryKey != null && dismissedNaturalSizeAdvisoryKey === naturalSizeAdvisoryKey,
        naturalSize: sourceNaturalSize,
        comparisonSize: advisoryComparisonSize,
        resolverSource: resolvedConstraintsReadout?.source ?? "manual",
        taggedDimensionsActive: effectiveTaggedDimensionsActive,
        canEditSessionDimensions: showExportSizeControls,
      }),
    [
      imageSrc,
      naturalSizeAdvisoryKey,
      dismissedNaturalSizeAdvisoryKey,
      sourceNaturalSize,
      advisoryComparisonSize,
      resolvedConstraintsReadout,
      effectiveTaggedDimensionsActive,
      showExportSizeControls,
    ]
  );

  const dismissNaturalSizeAdvisory = useCallback(() => {
    if (naturalSizeAdvisoryKey != null) {
      setDismissedNaturalSizeAdvisoryKey(naturalSizeAdvisoryKey);
    }
  }, [naturalSizeAdvisoryKey]);

  const applyNaturalSizeSuggestion = useCallback(() => {
    if (naturalSizeAdvisory == null || !naturalSizeAdvisory.canApplySuggestion) {
      return;
    }
    const next = applyNaturalSizeSuggestionToSession({
      width: naturalSizeAdvisory.suggestedSessionWidth,
      height: naturalSizeAdvisory.suggestedSessionHeight,
    });
    setOutputWidth(next.width);
    setOutputHeight(next.height);
    setWidthStr(next.widthStr);
    setHeightStr(next.heightStr);
    setCropFrameMode(next.cropFrameMode);
    setAspectPreset(next.aspectPreset);
  }, [naturalSizeAdvisory]);

  const exportDimensionsReady = useMemo(
    () =>
      resolveExportDimensionsReady({
        effectiveTaggedDimensionsActive,
        effectiveExportConstraints,
        cropFrameMode,
        widthStr,
        heightStr,
        aspectPreset,
      }),
    [effectiveTaggedDimensionsActive, effectiveExportConstraints, cropFrameMode, widthStr, heightStr, aspectPreset]
  );

  const exportDimensionsBlockedMessage: string | null = exportDimensionsReady
    ? null
    : "Choose export width and height (aspect + max width, or Custom) before placing";

  const cropAspect = useMemo(() => {
    if (cropFrameMode === "custom") {
      if (parsedOutputW <= 0 || parsedOutputH <= 0) {
        return undefined;
      }
      return parsedOutputW / parsedOutputH;
    }
    if (aspectPreset === "unset") {
      return undefined;
    }
    return aspectValue(aspectPreset);
  }, [cropFrameMode, parsedOutputW, parsedOutputH, aspectPreset]);

  const { estimatedBytes, estimatePending, estimateNonce, onQualityCommit } = useExportByteEstimate({
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    quality,
    exportFormat: effectiveExportFormat,
    enabled: exportDimensionsReady,
    onTowerUsageLimit: reportTowerUsageLimit,
  });

  const presetFileLimitBlocker = useMemo(
    () =>
      resolveImageEditorPresetFileLimitBlocker({
        enforceEnabled: true,
        maxFileSizeBytes: sessionMaxFileSizeBytes,
        estimatedBytes,
      }),
    [sessionMaxFileSizeBytes, estimatedBytes]
  );

  const exportSizeBlockedMessage = useMemo(() => {
    if (exportDimensionsBlockedMessage != null) {
      return exportDimensionsBlockedMessage;
    }
    if (presetFileLimitBlocker != null) {
      return "Over preset file limit";
    }
    return null;
  }, [exportDimensionsBlockedMessage, presetFileLimitBlocker]);

  const { originalPreviewUrl, compressedPreviewUrl, previewPending, getPopoutPreviewBlobs } = useExportQualityPreview({
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    quality,
    exportFormat: effectiveExportFormat,
    enabled: exportDimensionsReady,
    onTowerUsageLimit: reportTowerUsageLimit,
  });

  const qualityPopoutWindowRef = useRef<Window | null>(null);
  useQualityPopoutBridge({
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    exportFormat: effectiveExportFormat,
    setQuality,
    onQualityCommit,
    popoutWindowRef: qualityPopoutWindowRef,
    onTowerUsageLimit: reportTowerUsageLimit,
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
    setPathMode,
    flowStep,
    setFlowStep,
    clearImageSourceOnly,
    goToStep,
    chooseAutoPath,
    chooseConfigurePath,
    finishConfigurePath,
    stepExitFade,
    onStepExitTransitionEnd,
    beginAutoToUpload,
    beginPositionToSave,
    frameSummary,
    currentStepForNav,
    showFlowStepNav,
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
    autoTargetExportSizeLabel,
    exportDimensionsReady,
    isWorkspaceDesigner,
  });

  useLayoutEffect(() => {
    if (compose.active) {
      return;
    }
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
  }, [compose.active, showGuestOnboarding, roleReady, isWorkspaceDesigner, chooseAutoPath]);

  // Compose mode skips the entry/target steps — start directly on the upload dropzone.
  useLayoutEffect(() => {
    if (!compose.active) {
      return;
    }
    setPathMode("auto");
    setFlowStep("upload");
  }, [compose.active, setPathMode, setFlowStep]);

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
    scanProgress: autoScanProgress,
    scanError: autoScanError,
    pageScanned: autoPageScanned,
    rescan: onAutoRescan,
    selectionHint: autoSelectionHint,
    discoverySettled: autoDiscoverySettled,
  } = useImageEditorAutoTargets({
    flowStep,
    pathMode,
  });

  const applyAutoPageTarget = useCallback(
    async (t: ImagePageTarget) => {
      setAutoTargetHasDesignerExportTag(false);
      try {
        await webflow.setSelectedElement(t.element);
      } catch {
        /* selection may fail in edge cases */
      }
      if (t.kind === "component" && t.imagePropId != null) {
        setSelectedComponentImagePropId(t.imagePropId);
      }
      setPlacement(t.kind === "image" ? "replace" : "selection");
      setCropFrameMode("aspect");
      setAspectPreset("unset");
      setOutputWidth(0);
      setOutputHeight(0);
      setWidthStr("");
      setHeightStr("");
    },
    [setSelectedComponentImagePropId]
  );

  const onExportMaxWidthBlur = useCallback(() => {
    if (!useManualAspectAndMaxWidth || cropFrameMode !== "aspect") {
      return;
    }
    if (aspectPreset === "unset") {
      return;
    }
    const ar = aspectValue(aspectPreset);
    if (ar == null) {
      return;
    }
    const w = parseOutputDimensionStrict(widthStr);
    if (w == null) {
      return;
    }
    const { width, height } = dimensionsFromMaxWidthAndAspect(w, ar);
    setOutputWidth(width);
    setOutputHeight(height);
    setWidthStr(String(width));
    setHeightStr(String(height));
  }, [useManualAspectAndMaxWidth, cropFrameMode, aspectPreset, widthStr]);

  useEffect(() => {
    if (!useManualAspectAndMaxWidth || cropFrameMode !== "aspect") {
      return;
    }
    if (aspectPreset === "unset") {
      return;
    }
    const ar = aspectValue(aspectPreset);
    if (ar == null) {
      return;
    }
    const w = parseOutputDimensionStrict(widthStrRef.current);
    if (w == null) {
      return;
    }
    const { width, height } = dimensionsFromMaxWidthAndAspect(w, ar);
    setOutputWidth(width);
    setOutputHeight(height);
    setWidthStr(String(width));
    setHeightStr(String(height));
  }, [useManualAspectAndMaxWidth, cropFrameMode, aspectPreset]);

  const resetAutoTargetSelection = useCallback(() => {
    setAutoPageTarget(null);
    setAutoTargetHasDesignerExportTag(false);
    setAspectPreset("unset");
    setCropFrameMode("aspect");
    setWidthStr("");
    setHeightStr("");
    setOutputWidth(0);
    setOutputHeight(0);
  }, []);

  const designerPageIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const prev = designerPageIdRef.current;
    designerPageIdRef.current = resolverPageId;
    if (prev === undefined || prev === resolverPageId) {
      return;
    }
    resetAutoTargetSelection();
  }, [resolverPageId, resetAutoTargetSelection]);

  const onChooseAddImageEntry = useCallback(() => {
    resetAutoTargetSelection();
    chooseAutoPath();
  }, [resetAutoTargetSelection, chooseAutoPath]);

  const onChooseConfigureEntry = useCallback(() => {
    resetAutoTargetSelection();
    chooseConfigurePath();
  }, [resetAutoTargetSelection, chooseConfigurePath]);

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
      autoSelectionHint.kind === "image" || autoSelectionHint.kind === "component" ? autoSelectionHint.target : null;
    if (t) {
      setAutoPageTarget(t);
      void applyAutoPageTarget(t);
      beginAutoToUpload();
    }
  }, [autoSelectionHint, applyAutoPageTarget, beginAutoToUpload]);

  const hasCanvasImageTarget = hasAutoCanvasImageTarget(
    pathMode,
    flowStep,
    autoDiscoverySettled,
    autoSelectionHint.kind
  );

  const autoDisplaySurfaceTarget = useMemo(
    () => resolveDisplayedSurfaceTarget(autoSelectionHint, autoPageTarget),
    [autoPageTarget, autoSelectionHint]
  );

  const exportPlaceBlockedForApply = useMemo(() => {
    if (pathMode === "auto" && isConfirmedGuest && currentCmsItemId) {
      return { label: "Sign in to Tower to place images in this collection", code: null };
    }
    if (presetFileLimitBlocker != null) {
      return {
        label: "Over preset file limit",
        code: BEACON_IMAGE_ERROR_CODES.EXPORT_PRESET_FILE_LIMIT_EXCEEDED,
      };
    }
    return { label: null, code: null };
  }, [pathMode, isConfirmedGuest, currentCmsItemId, presetFileLimitBlocker]);

  useEffect(() => {
    if (pathMode === "unset" && flowStep === "entry") {
      setAutoPageTarget(null);
      setAutoTargetHasDesignerExportTag(false);
      setAspectPreset("unset");
      setCropFrameMode("aspect");
      setWidthStr("");
      setHeightStr("");
      setOutputWidth(0);
      setOutputHeight(0);
    }
  }, [pathMode, flowStep]);

  const handleExportSuccess = useCallback(
    (context: ImageExportSuccessContext) => {
      if (compose.active) {
        if (context.asset) {
          compose.onComplete?.(context.asset);
        }
        return;
      }
      setFlowStep("success");
    },
    [compose.active, compose.onComplete, setFlowStep]
  );

  const { busy, applyToCanvas, exportSuccess, clearExportSuccess } = useApplyCroppedToWebflow({
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    quality,
    exportFormat: effectiveExportFormat,
    fileBaseName,
    setFileBaseName,
    altText,
    setOutputWidth,
    setOutputHeight,
    setWidthStr,
    setHeightStr,
    componentImageProps,
    selectedComponentImagePropId,
    currentCmsItemId,
    assetFolders,
    selectedAssetFolderId,
    placement: effectivePlacement,
    replaceLibraryAsset,
    cmsPrimaryUpload: effectiveCmsPrimaryUpload,
    exportPlaceBlockedLabel: exportPlaceBlockedForApply.label,
    exportPlaceBlockedCode: exportPlaceBlockedForApply.code,
    onExportSuccess: handleExportSuccess,
    onTowerUsageLimit: reportTowerUsageLimit,
  });

  const { handleUploadAnotherAfterSuccess, handleReselectTargetAfterSuccess } = useImageEditorExportSuccessNavigation({
    clearExportSuccess,
    setFlowStep,
    clearImageSourceOnly,
    resetAutoTargetSelection,
    navigate,
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

  const offerSelectionPlacement = useMemo(
    () =>
      shouldOfferSelectionPlacement({
        selectedElementType,
        componentImagePropsResolving,
        componentImagePropCount: componentImageProps.length,
        elementCmsBinding,
        elementCmsBindingLoading,
      }),
    [
      selectedElementType,
      componentImagePropsResolving,
      componentImageProps.length,
      elementCmsBinding,
      elementCmsBindingLoading,
    ]
  );

  const offerReplacePlacement = useMemo(() => shouldOfferReplacePlacement(selectedElementType), [selectedElementType]);

  const resolvedPlacementForPlace = useMemo(
    () =>
      resolveImageEditorPlacement({
        placement: effectivePlacement,
        offerSelectionPlacement,
        offerReplacePlacement,
        guestCmsTemplateRestricted,
      }),
    [effectivePlacement, offerSelectionPlacement, offerReplacePlacement, guestCmsTemplateRestricted]
  );

  const hidePlacementCard = useMemo(() => compose.active || pathMode === "auto", [compose.active, pathMode]);
  const positionPageTarget = useMemo(
    () => (compose.active || pathMode !== "auto" ? null : autoDisplaySurfaceTarget),
    [compose.active, pathMode, autoDisplaySurfaceTarget]
  );

  const savePlaceButton = useMemo(
    () =>
      getImageEditorPlaceButtonState({
        exportPlaceBlockedLabel: exportPlaceBlockedForApply.label,
        exportSizeBlockedMessage,
        busy,
        foldersLoading,
        assetFolderCount: assetFolders.length,
        selectedAssetFolderId,
        cmsPrimaryUpload: effectiveCmsPrimaryUpload,
        elementCmsBindingLoading,
        completedCrop,
        placement: resolvedPlacementForPlace,
        selectedElementType,
        componentImagePropsResolving,
        componentImagePropCount: componentImageProps.length,
        selectedComponentImagePropId,
      }),
    [
      exportPlaceBlockedForApply,
      exportSizeBlockedMessage,
      busy,
      foldersLoading,
      assetFolders.length,
      selectedAssetFolderId,
      effectiveCmsPrimaryUpload,
      elementCmsBindingLoading,
      completedCrop,
      resolvedPlacementForPlace,
      selectedElementType,
      componentImagePropsResolving,
      componentImageProps.length,
      selectedComponentImagePropId,
    ]
  );

  const savePlaceAction = useMemo(
    () =>
      imageSrc != null && flowStep === "save"
        ? {
            label: savePlaceButton.label,
            disabled: savePlaceButton.disabled,
            busy: savePlaceButton.busy,
            onPlace: applyToCanvas,
          }
        : null,
    [imageSrc, flowStep, savePlaceButton, applyToCanvas]
  );

  const loadedEditor = (
    <ImageEditorLoadedEditor
      imageSrc={imageSrc}
      flowStep={flowStep}
      exportSuccess={exportSuccess}
      cmsCollectionTemplatePage={cmsCollectionTemplatePage}
      stepExitFade={stepExitFade}
      onStepExitTransitionEnd={onStepExitTransitionEnd}
      showReselectTarget={pathMode === "auto"}
      onUploadAnother={handleUploadAnotherAfterSuccess}
      onReselectTarget={handleReselectTargetAfterSuccess}
      cropPanelProps={{
        exportDimensionsReady,
        strictOutputDimensionInputs: !effectiveTaggedDimensionsActive,
        aspectPreset,
        visibleBuiltinAspectPresets: aspectPresetsForCrop,
        exportSizeUsesAspectAndMaxWidth: useManualAspectAndMaxWidth,
        showExportSizeControls,
        onExportMaxWidthBlur,
        assetFolders,
        baseId,
        busy,
        completedCrop,
        componentImageProps,
        crop,
        cropAspect,
        cropFrameMode,
        estimateNonce,
        estimatePending,
        estimatedBytes,
        fileBaseName,
        altText,
        folderActionBusy,
        foldersLoading,
        heightStr,
        imageSrc: imageSrc ?? "",
        onCreateAssetFolder: createAssetFolderNamed,
        onCropComplete,
        onQualityCommit,
        originalBytes,
        originalPreviewUrl,
        compressedPreviewUrl,
        previewPending,
        outputHeight,
        outputWidth,
        placement: effectivePlacement,
        quality,
        replaceLibraryAsset,
        selectedAssetFolderId,
        selectedComponentImagePropId,
        selectedElementType,
        componentImagePropsResolving,
        cmsPrimaryUpload: effectiveCmsPrimaryUpload,
        elementCmsBindingLoading,
        elementCmsBinding,
        guestCmsTemplateRestricted,
        setAspectPreset,
        setCrop,
        setCropFrameMode,
        setFileBaseName,
        setAltText,
        setHeightStr,
        setOutputHeight,
        setOutputWidth,
        setPlacement,
        setQuality,
        exportFormat,
        allowAvifEncoding,
        setExportFormat,
        onExportFormatCommit: onQualityCommit,
        setReplaceLibraryAsset,
        setSelectedAssetFolderId,
        setSelectedComponentImagePropId,
        setWidthStr,
        setZoom,
        widthStr,
        zoom,
        parsedExportWidth: parsedOutputW,
        parsedExportHeight: parsedOutputH,
        effectiveExportWidth: effectiveOutputW,
        effectiveExportHeight: effectiveOutputH,
        exportPreviewReady: exportDimensionsReady,
        onOpenQualityPopout: openQualityPopout,
        limitCropZoomToNativeResolution: settings.limitCropZoomToNativeResolution,
        flowPhase: flowStep === "position" ? "position" : "save",
        hidePlacementCard,
        frameSummary,
        showResolvedReadout: shouldShowResolvedReadout(compose.active),
        positionPageTarget,
        resolvedUploadTarget,
        resolvedConstraintsReadout,
        sessionMaxFileSizeBytes,
        presetFileLimitBlocker,
        naturalSizeAdvisory,
        onDismissNaturalSizeAdvisory: dismissNaturalSizeAdvisory,
        onApplyNaturalSizeSuggestion: applyNaturalSizeSuggestion,
        uploadPresetPickerVisible,
        uploadPresetPickerReadOnly,
        uploadPresetPickerValue: uploadPresetOptionId,
        uploadPresetPickerOptions,
        onUploadPresetPickerChange: handleUploadPresetPickerChange,
        exportFormatLocked: uploadPresetExportFormatLocked,
        avifPresetOverriddenByTowerLimit,
      }}
    />
  );

  const { subheader: stepNavSubheader, footer: routeFooter } = imageEditorRouteChromeSlots({
    showFlowStepNav,
    currentStepForNav,
    imageSrc,
    pathMode,
    composeActive: compose.active,
    goToStep,
    showGuestOnboarding,
    flowStep,
    autoDiscoverySettled,
    autoPageTarget,
    beginAutoToUpload,
    beginPositionToSave,
    continueToSaveDisabled: completedCrop == null || !exportDimensionsReady,
    stepExitFade,
    savePlaceAction,
    configurePresetsFooter,
  });

  return (
    <>
      <ImageEditorRouteChrome
        headerVariant={compose.active ? "breadcrumbsOnly" : "default"}
        contentClassName={flowStep === "autoElement" ? "h-full min-h-0 overflow-hidden" : undefined}
        scrollResetKey={
          flowStep === "configurePresets" && configurePresetsScrollResetKey
            ? `configurePresets:${configurePresetsScrollResetKey}`
            : flowStep
        }
        scrollable={flowStep !== "autoElement"}
        subheader={stepNavSubheader}
        footer={routeFooter}
      >
        <ImageEditorWorkspace
          emptyStateContent={
            showGuestOnboarding ? (
              <ImageEditorOnboarding
                towerConfigured={towerConfigured}
                earlyAccessRequired={earlyAccessRequired}
                onContinueAsGuest={() => {
                  chooseGuest();
                  navigate("/home");
                }}
              />
            ) : (
              <ImageEditorPreimageColumn
                autoPageScanned={autoPageScanned}
                autoScanError={autoScanError}
                autoScanPending={autoScanPending}
                autoScanProgress={autoScanProgress}
                autoSelectedTarget={autoPageTarget}
                autoDisplaySurfaceTarget={autoDisplaySurfaceTarget}
                autoDiscoverySettled={autoDiscoverySettled}
                autoTargets={autoScanTargets}
                hasCanvasImageTarget={hasCanvasImageTarget}
                onAutoUseCanvasSelection={onAutoUseCanvasSelection}
                dragActive={dragActive}
                stepExitFade={stepExitFade}
                fileInputId={fileInputId}
                onDoneConfiguringPresets={finishConfigurePath}
                onConfigurePresetsFooterChange={setConfigurePresetsFooter}
                onConfigurePresetsScrollResetKeyChange={setConfigurePresetsScrollResetKey}
                flowStep={flowStep}
                handleDrag={handleDrag}
                handleDragState={handleDragState}
                handleDrop={handleDrop}
                isConfirmedGuest={isConfirmedGuest}
                isTowerUser={isTowerUser}
                isWorkspaceDesigner={isWorkspaceDesigner}
                onAutoRescan={onAutoRescan}
                onAutoSelectTarget={onAutoSelectTarget}
                onChooseAddImage={onChooseAddImageEntry}
                onChooseConfigure={onChooseConfigureEntry}
                onStepExitTransitionEnd={onStepExitTransitionEnd}
                roleReady={roleReady}
              />
            )
          }
          beginOutgoingFade={beginOutgoingFade}
          dissolve={dissolve}
          dissolving={dissolving}
          dragActive={dragActive}
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
      </ImageEditorRouteChrome>
      <TowerUsageLimitDialog
        open={usageLimitDialogOpen}
        details={usageLimitDialogDetails}
        onOpenChange={onUsageLimitDialogOpenChange}
      />
    </>
  );
}
