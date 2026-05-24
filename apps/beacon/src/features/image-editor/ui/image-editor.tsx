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
import { isTowerConfigured, openTowerAuthPopup } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import type { PlacementMode } from "@/features/image-editor/lib/apply-cropped-export";
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
} from "@/features/image-editor/lib/image-editor-upload-preset-picker";
import { loadImage } from "@/features/image-editor/lib/load-image";
import { openQualityComparePopout } from "@/features/image-editor/lib/open-quality-compare-popout";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { webflowElementIdKey } from "@/features/image-editor/lib/webflow-element-id-key";
import { useApplyCroppedToWebflow } from "@/features/image-editor/model/use-apply-cropped-to-webflow";
import { useComponentInstanceImageProps } from "@/features/image-editor/model/use-component-instance-image-props";
import { useExportByteEstimate } from "@/features/image-editor/model/use-export-byte-estimate";
import { useExportQualityPreview } from "@/features/image-editor/model/use-export-quality-preview";
import { useImageDissolveTransition } from "@/features/image-editor/model/use-image-dissolve-transition";
import { useImageEditorAssetFolders } from "@/features/image-editor/model/use-image-editor-asset-folders";
import { useImageEditorAutoTargets } from "@/features/image-editor/model/use-image-editor-auto-targets";
import { useImageEditorExportSuccessNavigation } from "@/features/image-editor/model/use-image-editor-export-success-navigation";
import { useImageEditorWorkflow } from "@/features/image-editor/model/use-image-editor-workflow";
import { useImageOutputDimensionsOnLoad } from "@/features/image-editor/model/use-image-output-dimensions-on-load";
import { useQualityPopoutBridge } from "@/features/image-editor/model/use-quality-popout-bridge";
import { useResolvedExportConstraints } from "@/features/image-editor/model/use-resolved-export-constraints";
import { useRevokeBlobUrlOnChange } from "@/features/image-editor/model/use-revoke-blob-url";
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
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import {
  IMAGE_UPLOAD_CONTINUE_TO_ADD_LABEL,
  IMAGE_UPLOAD_CONTINUE_TO_SAVE_LABEL,
} from "@/shared/lib/beacon-feature-route-copy";
import { useCmsCollectionTemplatePage } from "@/shared/lib/use-cms-collection-template-page";
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
        steps={getImageEditorNavSteps(pathMode).map((step) => ({
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

export function ImageEditor() {
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
  const [quality, setQuality] = useState(settings.defaultExportQuality);
  const [exportFormat, setExportFormat] = useState<ImageExportFormat>(settings.defaultExportFormat);
  const [sessionMaxFileSizeBytes, setSessionMaxFileSizeBytes] = useState<number | null>(null);
  const [placement, setPlacement] = useState<PlacementMode>("library");
  const [replaceLibraryAsset, setReplaceLibraryAsset] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [originalBytes, setOriginalBytes] = useState<number | null>(null);
  const { visible: guestWelcomeVisible, markGuestWelcomeComplete } = useBeaconGuestWelcomeVisible();
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
  const allowAvifEncoding = Boolean(towerUser);
  const isConfirmedGuest = !towerUser && !towerSessionPending;
  const { isCmsCollectionTemplatePage: cmsCollectionTemplatePage } = useCmsCollectionTemplatePage();
  const guestCmsTemplateRestricted = isConfirmedGuest && cmsCollectionTemplatePage;
  /** Guest onboarding only after Tower session resolves; while pending, show the empty drop zone (no loading interstitial). */
  const showGuestOnboarding = !imageSrc && guestWelcomeVisible;
  const prevShowGuestOnboarding = useRef(false);
  const [resolverSiteId, setResolverSiteId] = useState<string | null>(null);
  const [resolverPageId, setResolverPageId] = useState<string | null>(null);
  const [resolvedUploadTarget, setResolvedUploadTarget] = useState<ResolvedUploadTarget | null>(null);
  const [configurePresetsFooter, setConfigurePresetsFooter] = useState<ReactNode | null>(null);
  const [configurePresetsScrollResetKey, setConfigurePresetsScrollResetKey] = useState<string | null>(null);
  const lastResolvedTargetInputKeyRef = useRef<string | null>(null);
  const resolvedTargetForInputKeyRef = useRef<string | null>(null);
  const lastUploadPresetTargetInputKeyRef = useRef<string | null>(null);
  const userPickedUploadPresetRef = useRef(false);
  const lastAppliedUploadPresetOptionIdRef = useRef<string | null>(null);
  const skipNextPersistExportDefaultsRef = useRef(false);
  const [uploadPresetOptionId, setUploadPresetOptionId] = useState<string>("");

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
    void webflow
      .getCurrentPage()
      .then((page) => {
        if (!cancelled) {
          setResolverPageId(page.id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolverPageId(null);
        }
      });
    const unsub = webflow.subscribe("currentpage", (page) => {
      setResolverPageId(page.id);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const resolverTargetInput = useMemo(() => {
    if (resolverSiteId == null || resolverPageId == null || imageSrc == null) {
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

  const uploadPresetPickerReadOnly = useMemo(
    () => Boolean(isTowerUser && editorExperience && !canManageTeamBeaconSettings),
    [isTowerUser, editorExperience, canManageTeamBeaconSettings]
  );

  const uploadPresetPickerVisible = useMemo(
    () => uploadPresetPickerOptions.length > 0 && !editorExperience,
    [uploadPresetPickerOptions.length, editorExperience]
  );

  const uploadPresetManualOverride = useMemo(
    () => isManualUploadPresetOptionId(uploadPresetOptionId),
    [uploadPresetOptionId]
  );

  const showExportSizeControls = useMemo(
    () => uploadPresetPickerVisible && uploadPresetManualOverride,
    [uploadPresetPickerVisible, uploadPresetManualOverride]
  );

  const effectiveTaggedDimensionsActive = autoTargetHasDesignerExportTag && !uploadPresetManualOverride;

  useEffect(() => {
    if (imageSrc == null) {
      setUploadPresetOptionId("");
      lastAppliedUploadPresetOptionIdRef.current = null;
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
    if (!towerUser?.id || !settingsPullSynced || serverExportDefaultsAppliedRef.current) {
      return;
    }
    serverExportDefaultsAppliedRef.current = true;
    setExportFormat(settings.defaultExportFormat);
    setQuality(settings.defaultExportQuality);
    exportDefaultsHydratedRef.current = true;
  }, [towerUser?.id, settingsPullSynced, settings]);

  useEffect(() => {
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
  }, [exportFormat, quality, canPersistExportDefaults, updateSettings]);

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
    applySessionConstraintsFromPickerSelection(selectedConstraints, {
      setOutputWidth,
      setOutputHeight,
      setWidthStr,
      setHeightStr,
      setExportFormat,
      setQuality,
      setCropFrameMode,
      setAspectPreset,
    });
  }, [resolvedUploadTarget, uploadPresetOptionId, uploadPresetPickerOptionMap, imageSrc]);

  useEffect(() => {
    if (uploadPresetExportFormatLocked) {
      return;
    }
    if (!allowAvifEncoding && exportFormat === "avif") {
      setExportFormat("webp");
    }
  }, [allowAvifEncoding, exportFormat, uploadPresetExportFormatLocked]);

  useEffect(() => {
    if (towerUser) {
      markGuestWelcomeComplete();
    }
  }, [towerUser, markGuestWelcomeComplete]);

  useEffect(() => {
    if (towerUser && prevShowGuestOnboarding.current) {
      navigate("/home");
    }
    prevShowGuestOnboarding.current = showGuestOnboarding;
  }, [towerUser, showGuestOnboarding, navigate]);

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

  const exportDimensionsReady = useMemo((): boolean => {
    if (uploadPresetPickerVisible && !uploadPresetManualOverride) {
      const selectedOption = uploadPresetPickerOptionMap.get(uploadPresetOptionId);
      const constraints = selectedOption?.constraints;
      return constraints != null && constraints.width > 0 && constraints.height > 0;
    }
    if (effectiveTaggedDimensionsActive) {
      return true;
    }
    if (cropFrameMode === "custom") {
      return parseOutputDimensionStrict(widthStr) != null && parseOutputDimensionStrict(heightStr) != null;
    }
    if (aspectPreset === "unset") {
      return false;
    }
    const w = parseOutputDimensionStrict(widthStr);
    const r = aspectValue(aspectPreset);
    if (r == null || w == null || w < 1) {
      return false;
    }
    return true;
  }, [
    uploadPresetPickerVisible,
    uploadPresetManualOverride,
    uploadPresetPickerOptionMap,
    uploadPresetOptionId,
    effectiveTaggedDimensionsActive,
    cropFrameMode,
    widthStr,
    heightStr,
    aspectPreset,
  ]);

  const exportDimensionsBlockedMessage: string | null = exportDimensionsReady
    ? null
    : "Choose export width and height (aspect + max width, or Custom) before placing";

  const cropAspect = useMemo(() => {
    if (cropFrameMode === "custom") {
      const h = effectiveOutputH;
      if (h <= 0) {
        return undefined;
      }
      return effectiveOutputW / h;
    }
    if (aspectPreset === "unset") {
      return undefined;
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
    enabled: exportDimensionsReady,
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
    exportFormat,
    enabled: exportDimensionsReady,
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

  const onChooseAddImageEntry = useCallback(() => {
    setAutoPageTarget(null);
    setAutoTargetHasDesignerExportTag(false);
    setAspectPreset("unset");
    setCropFrameMode("aspect");
    setWidthStr("");
    setHeightStr("");
    setOutputWidth(0);
    setOutputHeight(0);
    chooseAutoPath();
  }, [chooseAutoPath]);

  const onChooseConfigureEntry = useCallback(() => {
    setAutoPageTarget(null);
    setAutoTargetHasDesignerExportTag(false);
    setAspectPreset("unset");
    setCropFrameMode("aspect");
    setWidthStr("");
    setHeightStr("");
    setOutputWidth(0);
    setOutputHeight(0);
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

  const handleExportSuccess = useCallback(() => {
    setFlowStep("success");
  }, [setFlowStep]);

  const { busy, applyToCanvas, exportSuccess, clearExportSuccess } = useApplyCroppedToWebflow({
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
    exportPlaceBlockedLabel: exportPlaceBlockedForApply.label,
    exportPlaceBlockedCode: exportPlaceBlockedForApply.code,
    onExportSuccess: handleExportSuccess,
  });

  const { handleUploadAnotherAfterSuccess } = useImageEditorExportSuccessNavigation({
    clearExportSuccess,
    setFlowStep,
    clearImageSourceOnly,
    pathMode,
    autoPageTarget,
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

  const openTowerEmailSignInPopup = useCallback(() => {
    openTowerAuthPopup("/sign-in");
  }, []);

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
        placement,
        offerSelectionPlacement,
        offerReplacePlacement,
        guestCmsTemplateRestricted,
      }),
    [placement, offerSelectionPlacement, offerReplacePlacement, guestCmsTemplateRestricted]
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
        cmsPrimaryUpload,
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
      cmsPrimaryUpload,
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
      onUploadAnother={handleUploadAnotherAfterSuccess}
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
        placement,
        quality,
        replaceLibraryAsset,
        selectedAssetFolderId,
        selectedComponentImagePropId,
        selectedElementType,
        componentImagePropsResolving,
        cmsPrimaryUpload,
        elementCmsBindingLoading,
        elementCmsBinding,
        guestCmsTemplateRestricted,
        setAspectPreset,
        setCrop,
        setCropFrameMode,
        setFileBaseName,
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
        hidePlacementCard: pathMode === "auto",
        frameSummary,
        showResolvedReadout: true,
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
      }}
    />
  );

  const { subheader: stepNavSubheader, footer: routeFooter } = imageEditorRouteChromeSlots({
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
    continueToSaveDisabled: completedCrop == null || !exportDimensionsReady,
    stepExitFade,
    savePlaceAction,
    configurePresetsFooter,
  });

  return (
    <ImageEditorRouteChrome
      scrollResetKey={
        flowStep === "configurePresets" && configurePresetsScrollResetKey
          ? `configurePresets:${configurePresetsScrollResetKey}`
          : flowStep
      }
      subheader={stepNavSubheader}
      footer={routeFooter}
    >
      <ImageEditorWorkspace
        emptyStateContent={
          showGuestOnboarding ? (
            <ImageEditorOnboarding
              towerConfigured={towerConfigured}
              onSignInToTower={openTowerEmailSignInPopup}
              onContinueAsGuest={() => {
                markGuestWelcomeComplete();
                navigate("/home");
              }}
            />
          ) : (
            <ImageEditorPreimageColumn
              autoPageScanned={autoPageScanned}
              autoScanError={autoScanError}
              autoScanPending={autoScanPending}
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
  );
}
