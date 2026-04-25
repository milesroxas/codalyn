import type { ImageExportFormat } from "@codalyn/webflow-kit";
import { Crop, FolderPlus, Info, Loader2 } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useState } from "react";
import type { Area, MediaSize } from "react-easy-crop";
import Cropper from "react-easy-crop";

import type { PlacementMode } from "@/features/image-editor/lib/apply-cropped-export";
import { parseOutputDimension, WEBFLOW_IMAGE_ELEMENT_TYPE } from "@/features/image-editor/lib/apply-cropped-export";
import { type AspectPreset, aspectLabels } from "@/features/image-editor/lib/aspect-preset";
import type { AssetFolderRow } from "@/features/image-editor/lib/asset-folder-row";
import type { ElementCmsBindingResolution } from "@/features/image-editor/lib/cms-primary-upload-context";
import type { ComponentImagePropOption } from "@/features/image-editor/lib/component-image-prop";
import {
  getImageEditorPlacementReadiness,
  type ImageEditorPlacementBlocker,
  resolvePlacementWhenOptionHidden,
  shouldOfferReplacePlacement,
  shouldOfferSelectionPlacement,
} from "@/features/image-editor/lib/image-editor-placement-readiness";
import { sanitizeAssetBaseName } from "@/features/image-editor/lib/sanitize-asset-base-name";
import { ExportEncodeSizeFootnote } from "@/features/image-editor/ui/export-size-estimate";
import { QualityComparePreview } from "@/features/image-editor/ui/quality-compare-preview";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Slider } from "@/shared/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

/** Matches react-easy-crop `getMediaZoom`: rendered size vs natural, dominant axis. */
function mediaDisplayToNaturalRatio(media: MediaSize): number {
  return media.width > media.height ? media.width / media.naturalWidth : media.height / media.naturalHeight;
}

function InfoTip(props: { text: string; ariaLabel: string; className?: string }) {
  const { text, ariaLabel, className } = props;
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className={cn(
          "text-muted-foreground hover:text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          className
        )}
        aria-label={ariaLabel}
      >
        <Info className="size-3.5" aria-hidden />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

/** Upper bound for crop preview zoom slider and Cropper (historical UI cap). */
const IMAGE_EDITOR_CROP_MAX_ZOOM = 4;

function maxZoomForNativeResolutionCap(media: MediaSize | null, limit: boolean): number {
  if (!limit || !media?.naturalWidth || !media?.naturalHeight) {
    return IMAGE_EDITOR_CROP_MAX_ZOOM;
  }
  const r = mediaDisplayToNaturalRatio(media);
  if (!(r > 0) || !Number.isFinite(r)) {
    return IMAGE_EDITOR_CROP_MAX_ZOOM;
  }
  const nativeCap = 1 / r;
  return Math.min(IMAGE_EDITOR_CROP_MAX_ZOOM, Math.max(1, nativeCap));
}

/** Aspect ratio templates vs. W×H-driven crop frame (same slot in the UI). */
export type CropFrameMode = "aspect" | "custom";

export type { AspectPreset, AssetFolderRow, ComponentImagePropOption };

export type ImageEditorCropExportPanelProps = {
  baseId: string;
  imageSrc: string;
  cropAspect: number | undefined;
  crop: { x: number; y: number };
  setCrop: (c: { x: number; y: number }) => void;
  zoom: number;
  setZoom: (z: number) => void;
  onCropComplete: (c: Area, px: Area) => void;
  cropFrameMode: CropFrameMode;
  setCropFrameMode: (m: CropFrameMode) => void;
  aspectPreset: AspectPreset;
  setAspectPreset: (p: AspectPreset) => void;
  visibleBuiltinAspectPresets: AspectPreset[];
  widthStr: string;
  setWidthStr: (s: string) => void;
  outputWidth: number;
  setOutputWidth: (n: number) => void;
  heightStr: string;
  setHeightStr: (s: string) => void;
  outputHeight: number;
  setOutputHeight: (n: number) => void;
  fileBaseName: string;
  setFileBaseName: (s: string) => void;
  quality: number;
  setQuality: (q: number) => void;
  onQualityCommit: () => void;
  exportFormat: ImageExportFormat;
  allowAvifEncoding: boolean;
  setExportFormat: (f: ImageExportFormat) => void;
  onExportFormatCommit: () => void;
  completedCrop: Area | null;
  estimatePending: boolean;
  estimatedBytes: number | null;
  originalBytes: number | null;
  estimateNonce: number;
  originalPreviewUrl: string | null;
  compressedPreviewUrl: string | null;
  previewPending: boolean;
  assetFolders: AssetFolderRow[];
  foldersLoading: boolean;
  folderActionBusy: boolean;
  selectedAssetFolderId: string | null;
  setSelectedAssetFolderId: (id: string | null) => void;
  onCreateAssetFolder: (name: string, parentFolderId: string | null) => Promise<boolean>;
  placement: PlacementMode;
  setPlacement: (p: PlacementMode) => void;
  replaceLibraryAsset: boolean;
  setReplaceLibraryAsset: (v: boolean) => void;
  componentImageProps: ComponentImagePropOption[];
  selectedComponentImagePropId: string | null;
  setSelectedComponentImagePropId: (id: string | null) => void;
  /** Current canvas selection `element.type` (Designer API), for placement validation. */
  selectedElementType: string | null;
  /** True while resolving image fields for the selected component instance. */
  componentImagePropsResolving: boolean;
  /** When true, export may use the first Assets folder if none is selected (CMS field update on current item). */
  cmsPrimaryUpload: boolean;
  /** True while resolving CMS image bindings on the selected canvas element. */
  elementCmsBindingLoading: boolean;
  /** Resolved CMS image binding count on the selected non-component element (`none` until loaded). */
  elementCmsBinding: ElementCmsBindingResolution;
  /** Guest on a CMS collection template page: only Assets or local WebP download. */
  guestCmsTemplateRestricted: boolean;
  busy: boolean;
  onApplyToCanvas: () => void | Promise<void>;
  /** When set, primary export is disabled. */
  exportPlaceBlockedLabel: string | null;
  parsedExportWidth: number;
  parsedExportHeight: number;
  effectiveExportWidth: number;
  effectiveExportHeight: number;
  onOpenQualityPopout: () => void;
  limitCropZoomToNativeResolution: boolean;
  /** `position` — crop and zoom only; `save` — encoding, placement, and primary action. */
  flowPhase: "position" | "save";
  onContinueToSave: () => void;
  /** Auto path: one screen (crop + encode + folder + place); no placement step — target was chosen earlier. */
  unifiedPositionAndSave?: boolean;
  frameSummary: string;
};

/** Fade + slide down into place; `delayMs` staggers rows below the crop preview. */
function staggerBelowCropClass(entered: boolean, delayMs: number) {
  return cn(
    "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform]",
    entered ? "translate-y-0 opacity-100" : "-translate-y-2.5 opacity-0 [transition-delay:0ms]",
    entered && `[transition-delay:${delayMs}ms]`
  );
}

const PLACEMENT_OPTIONS: {
  value: PlacementMode;
  title: string;
  description: string;
}[] = [
  {
    value: "library",
    title: "Assets only",
    description: "Upload to your folder. The page stays unchanged.",
  },
  {
    value: "canvas",
    title: "Page",
    description: "New image at the end of the page body.",
  },
  {
    value: "selection",
    title: "Use selection",
    description: "Bind a field or insert next to the selection.",
  },
  {
    value: "replace",
    title: "Replace image",
    description: "Swap the selected Image's source.",
  },
  {
    value: "download",
    title: "Download image",
    description: "Save an optimized WebP file to your computer.",
  },
];

type PlaceButtonState = {
  disabled: boolean;
  label: string;
  busy: boolean;
};

const IMAGE_EDITOR_PLACEMENT_BLOCKER_LABELS: Record<ImageEditorPlacementBlocker, string> = {
  "missing-crop": "Crop first",
  "replace-wrong-type": "Select an Image",
  "selection-empty": "Select an element",
  "selection-props-loading": "Syncing…",
  "selection-pick-field": "Pick a field",
};

function placeButtonStateIfDownloadExport(p: {
  placement: PlacementMode;
  completedCrop: Area | null;
  selectedElementType: string | null;
  componentImagePropsResolving: boolean;
  componentImagePropCount: number;
  selectedComponentImagePropId: string | null;
}): PlaceButtonState | null {
  if (p.placement !== "download") {
    return null;
  }
  const readiness = getImageEditorPlacementReadiness({
    placement: p.placement,
    hasCompletedCrop: p.completedCrop != null,
    selectedElementType: p.selectedElementType,
    componentImagePropsResolving: p.componentImagePropsResolving,
    componentImagePropCount: p.componentImagePropCount,
    selectedComponentImagePropId: p.selectedComponentImagePropId,
  });
  if (!readiness.ok) {
    return {
      disabled: true,
      label: IMAGE_EDITOR_PLACEMENT_BLOCKER_LABELS[readiness.blocker],
      busy: false,
    };
  }
  return { disabled: false, label: "Download image", busy: false };
}

function placeButtonStateForPlacement(p: {
  exportPlaceBlockedLabel: string | null;
  busy: boolean;
  foldersLoading: boolean;
  assetFolderCount: number;
  selectedAssetFolderId: string | null;
  cmsPrimaryUpload: boolean;
  elementCmsBindingLoading: boolean;
  completedCrop: Area | null;
  placement: PlacementMode;
  selectedElementType: string | null;
  componentImagePropsResolving: boolean;
  componentImagePropCount: number;
  selectedComponentImagePropId: string | null;
}): PlaceButtonState {
  const {
    exportPlaceBlockedLabel,
    busy,
    foldersLoading,
    assetFolderCount,
    selectedAssetFolderId,
    cmsPrimaryUpload,
    elementCmsBindingLoading,
    completedCrop,
    placement,
    selectedElementType,
    componentImagePropsResolving,
    componentImagePropCount,
    selectedComponentImagePropId,
  } = p;

  if (busy) {
    return { disabled: true, label: "Saving…", busy: true };
  }

  if (exportPlaceBlockedLabel) {
    return { disabled: true, label: exportPlaceBlockedLabel, busy: false };
  }

  const downloadState = placeButtonStateIfDownloadExport({
    placement,
    completedCrop,
    selectedElementType,
    componentImagePropsResolving,
    componentImagePropCount,
    selectedComponentImagePropId,
  });
  if (downloadState) {
    return downloadState;
  }

  if (foldersLoading) {
    return { disabled: true, label: "Loading folders…", busy: false };
  }
  if (assetFolderCount === 0) {
    return { disabled: true, label: "Create an Assets folder", busy: false };
  }

  const selectionBindingLoading =
    elementCmsBindingLoading &&
    placement !== "canvas" &&
    placement !== "library" &&
    (placement === "replace"
      ? selectedElementType === WEBFLOW_IMAGE_ELEMENT_TYPE
      : selectedElementType !== "ComponentInstance" && selectedElementType !== null);

  if (selectionBindingLoading) {
    return { disabled: true, label: "Syncing…", busy: false };
  }

  if (selectedAssetFolderId === null && !cmsPrimaryUpload) {
    return { disabled: true, label: "Choose a folder", busy: false };
  }

  const readiness = getImageEditorPlacementReadiness({
    placement,
    hasCompletedCrop: completedCrop != null,
    selectedElementType,
    componentImagePropsResolving,
    componentImagePropCount,
    selectedComponentImagePropId,
  });

  if (!readiness.ok) {
    return {
      disabled: true,
      label: IMAGE_EDITOR_PLACEMENT_BLOCKER_LABELS[readiness.blocker],
      busy: false,
    };
  }

  if (placement === "library") {
    return { disabled: false, label: "Save to Assets", busy: false };
  }
  if (placement === "canvas") {
    return { disabled: false, label: "Add to page", busy: false };
  }
  if (placement === "replace") {
    return { disabled: false, label: "Replace image", busy: false };
  }
  return { disabled: false, label: "Place image", busy: false };
}

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[0.7rem] font-semibold text-primary-foreground tabular-nums shadow-sm"
        aria-hidden
      >
        {n}
      </span>
      <span className="text-sm font-medium leading-none">{label}</span>
    </div>
  );
}

type CropStageProps = {
  baseId: string;
  imageSrc: string;
  cropAspect: number | undefined;
  crop: { x: number; y: number };
  setCrop: (c: { x: number; y: number }) => void;
  zoom: number;
  setZoom: (z: number) => void;
  onCropComplete: (c: Area, px: Area) => void;
  belowCropEntered: boolean;
  cropFrameMode: CropFrameMode;
  setCropFrameMode: (m: CropFrameMode) => void;
  aspectPreset: AspectPreset;
  setAspectPreset: (p: AspectPreset) => void;
  visibleBuiltinAspectPresets: AspectPreset[];
  widthStr: string;
  setWidthStr: (s: string) => void;
  outputWidth: number;
  setOutputWidth: (n: number) => void;
  heightStr: string;
  setHeightStr: (s: string) => void;
  outputHeight: number;
  setOutputHeight: (n: number) => void;
  limitCropZoomToNativeResolution: boolean;
  positionOnly: boolean;
  /** When `positionOnly`, show a step badge (e.g. Auto path single screen). */
  showPositionStepBadge?: boolean;
  frameSummary: string;
};

function CropStageSection(p: CropStageProps) {
  const {
    baseId,
    imageSrc,
    cropAspect,
    crop,
    setCrop,
    zoom,
    setZoom,
    onCropComplete,
    belowCropEntered,
    cropFrameMode,
    setCropFrameMode,
    aspectPreset,
    setAspectPreset,
    visibleBuiltinAspectPresets,
    widthStr,
    setWidthStr,
    outputWidth,
    setOutputWidth,
    heightStr,
    setHeightStr,
    outputHeight,
    setOutputHeight,
    limitCropZoomToNativeResolution,
    positionOnly,
    showPositionStepBadge = false,
    frameSummary,
  } = p;

  const [cropMediaSize, setCropMediaSize] = useState<MediaSize | null>(null);

  useEffect(() => {
    void imageSrc;
    setCropMediaSize(null);
  }, [imageSrc]);

  const cropMaxZoom = useMemo(
    () => maxZoomForNativeResolutionCap(cropMediaSize, limitCropZoomToNativeResolution),
    [cropMediaSize, limitCropZoomToNativeResolution]
  );

  useLayoutEffect(() => {
    if (zoom > cropMaxZoom) {
      setZoom(cropMaxZoom);
    }
  }, [zoom, cropMaxZoom, setZoom]);

  return (
    <section className="mt-4 flex flex-col gap-3" aria-labelledby={`${baseId}-step-crop`}>
      <h2 className="sr-only" id={`${baseId}-step-crop`}>
        {positionOnly ? "Position image" : "Step 1: Crop"}
      </h2>
      {positionOnly ? (
        showPositionStepBadge ? (
          <StepBadge n={1} label="Position" />
        ) : null
      ) : (
        <StepBadge n={1} label="Crop" />
      )}
      <Card size="sm">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-sm font-medium">{positionOnly ? "Position" : "Crop area"}</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            {positionOnly ? frameSummary : "Drag to frame what you export."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          <div className="relative h-64 w-full overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/30">
            <Cropper
              aspect={cropAspect}
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={cropMaxZoom}
              zoomWithScroll={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              onMediaLoaded={setCropMediaSize}
              objectFit="contain"
            />
          </div>

          <div className={staggerBelowCropClass(belowCropEntered, 0)}>
            <div className="flex flex-col gap-2.5 rounded-lg border border-border/70 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium" htmlFor={`${baseId}-zoom`}>
                  Zoom
                </Label>
                <span className="text-muted-foreground text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
              </div>
              <Slider
                id={`${baseId}-zoom`}
                min={1}
                max={cropMaxZoom}
                step={0.01}
                value={[zoom]}
                onValueChange={(v) => setZoom(Math.min(cropMaxZoom, v[0] ?? 1))}
              />
            </div>
          </div>

          {positionOnly ? null : (
            <div className={staggerBelowCropClass(belowCropEntered, 90)}>
              <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="flex items-center gap-1">
                  <Label className="text-xs font-medium" htmlFor={`${baseId}-frame-mode`}>
                    Crop shape
                  </Label>
                  <InfoTip
                    ariaLabel="About crop shape"
                    text="Aspect ratios lock the crop mask. Custom uses the width and height fields below for the crop shape."
                  />
                </div>
                <ToggleGroup
                  id={`${baseId}-frame-mode`}
                  className="grid w-full min-w-0 grid-cols-2 gap-0"
                  type="single"
                  value={cropFrameMode}
                  onValueChange={(v) => {
                    if (v) {
                      setCropFrameMode(v as CropFrameMode);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  spacing={0}
                >
                  <ToggleGroupItem
                    value="aspect"
                    className="min-w-0 shrink whitespace-normal text-center leading-tight"
                  >
                    Aspect ratios
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="custom"
                    className="min-w-0 shrink whitespace-normal text-center leading-tight"
                  >
                    Custom
                  </ToggleGroupItem>
                </ToggleGroup>
                {cropFrameMode === "aspect" ? (
                  <ToggleGroup
                    id={`${baseId}-aspect`}
                    className="grid w-full min-w-0 grid-cols-3 gap-0"
                    type="single"
                    value={aspectPreset}
                    onValueChange={(v) => {
                      if (v) {
                        setAspectPreset(v as AspectPreset);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    spacing={0}
                  >
                    {visibleBuiltinAspectPresets.map((preset) => (
                      <ToggleGroupItem
                        key={preset}
                        value={preset}
                        className="min-w-0 shrink whitespace-normal text-center leading-tight"
                      >
                        {aspectLabels[preset]}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1">
                          <Label className="text-xs" htmlFor={`${baseId}-ow`}>
                            Width (px)
                          </Label>
                          <InfoTip ariaLabel="About output dimensions" text="Use values from 1 to 8192 px per side." />
                        </div>
                        <Input
                          id={`${baseId}-ow`}
                          aria-label="Output width in pixels"
                          inputMode="numeric"
                          type="text"
                          value={widthStr}
                          onChange={(e) => setWidthStr(e.target.value)}
                          onBlur={() => {
                            const w = parseOutputDimension(widthStr, outputWidth);
                            setOutputWidth(w);
                            setWidthStr(String(w));
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs" htmlFor={`${baseId}-oh`}>
                          Height (px)
                        </Label>
                        <Input
                          id={`${baseId}-oh`}
                          aria-label="Output height in pixels"
                          inputMode="numeric"
                          type="text"
                          value={heightStr}
                          onChange={(e) => setHeightStr(e.target.value)}
                          onBlur={() => {
                            const h = parseOutputDimension(heightStr, outputHeight);
                            setOutputHeight(h);
                            setHeightStr(String(h));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

type ExportCardProps = {
  baseId: string;
  fileBaseName: string;
  setFileBaseName: (s: string) => void;
  quality: number;
  setQuality: (q: number) => void;
  onQualityCommit: () => void;
  exportFormat: ImageExportFormat;
  allowAvifEncoding: boolean;
  setExportFormat: (f: ImageExportFormat) => void;
  onExportFormatCommit: () => void;
  completedCrop: Area | null;
  estimatePending: boolean;
  estimatedBytes: number | null;
  originalBytes: number | null;
  estimateNonce: number;
  originalPreviewUrl: string | null;
  compressedPreviewUrl: string | null;
  previewPending: boolean;
  parsedExportWidth: number;
  parsedExportHeight: number;
  effectiveExportWidth: number;
  effectiveExportHeight: number;
  onOpenQualityPopout: () => void;
  stepBadgeNumber?: number;
};

function ExportEncodeCard(p: ExportCardProps) {
  const {
    baseId,
    fileBaseName,
    setFileBaseName,
    quality,
    setQuality,
    onQualityCommit,
    exportFormat,
    allowAvifEncoding,
    setExportFormat,
    onExportFormatCommit,
    completedCrop,
    estimatePending,
    estimatedBytes,
    originalBytes,
    estimateNonce,
    originalPreviewUrl,
    compressedPreviewUrl,
    previewPending,
    parsedExportWidth,
    parsedExportHeight,
    effectiveExportWidth,
    effectiveExportHeight,
    onOpenQualityPopout,
    stepBadgeNumber = 1,
  } = p;

  const exportW = completedCrop ? effectiveExportWidth : parsedExportWidth;
  const exportH = completedCrop ? effectiveExportHeight : parsedExportHeight;

  return (
    <section className="mt-4 flex flex-col gap-3" aria-labelledby={`${baseId}-step-export`}>
      <h2 className="sr-only" id={`${baseId}-step-export`}>
        Encode
      </h2>
      <StepBadge n={stepBadgeNumber} label="Export" />
      <Card size="sm">
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-sm font-medium">Encode & save</CardTitle>
          <CardDescription className="text-xs leading-snug">
            Choose a format, check the preview, then tune quality. Estimates appear once the crop is set.
          </CardDescription>
          <p className="text-muted-foreground pt-0.5 text-[11px] tabular-nums leading-snug" aria-live="polite">
            Output{" "}
            <span className="text-foreground font-medium">
              {exportW}×{exportH}px
            </span>
            {completedCrop ? null : <span className="text-muted-foreground"> · finalize in crop step</span>}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-0">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium" htmlFor={`${baseId}-fn`}>
              File name
            </Label>
            <Input
              id={`${baseId}-fn`}
              aria-label="Exported file base name"
              autoComplete="off"
              value={fileBaseName}
              onChange={(e) => setFileBaseName(e.target.value)}
              onBlur={() => setFileBaseName(sanitizeAssetBaseName(fileBaseName))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-medium" id={`${baseId}-format`}>
                File type
              </Label>
              {allowAvifEncoding ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      aria-label="When to use WebP vs AVIF"
                    >
                      <Info className="size-3.5" aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[16rem] whitespace-pre-line text-left">
                    {
                      "WebP — Default: broad browser support; encodes in Designer.\n\nAVIF — Often smaller at similar quality; encoding uses Tower."
                    }
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
            {allowAvifEncoding ? (
              <ToggleGroup
                type="single"
                value={exportFormat}
                onValueChange={(v) => {
                  if (v === "webp" || v === "avif") {
                    setExportFormat(v);
                    onExportFormatCommit();
                  }
                }}
                aria-labelledby={`${baseId}-format`}
                className="grid w-full min-w-0 grid-cols-2 gap-0"
                variant="outline"
                size="sm"
                spacing={0}
              >
                <ToggleGroupItem value="webp" className="min-w-0 shrink text-xs font-medium whitespace-normal">
                  WebP
                </ToggleGroupItem>
                <ToggleGroupItem value="avif" className="min-w-0 shrink text-xs font-medium whitespace-normal">
                  AVIF
                </ToggleGroupItem>
              </ToggleGroup>
            ) : (
              <>
                <div className="text-foreground rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm font-medium">
                  WebP
                </div>
                <p className="text-muted-foreground text-[10px] leading-snug">Sign in to Tower to enable AVIF.</p>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {completedCrop ? (
              <QualityComparePreview
                originalSrc={originalPreviewUrl}
                compressedSrc={compressedPreviewUrl}
                pending={previewPending}
                exportWidth={effectiveExportWidth}
                exportHeight={effectiveExportHeight}
                onOpenQualityPopout={onOpenQualityPopout}
              />
            ) : (
              <div className="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center">
                <p className="text-muted-foreground text-xs font-medium">Preview after crop</p>
                <p className="text-muted-foreground max-w-[16rem] text-[10px] leading-snug">
                  After you finish positioning, the preview and quality compare are available here.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3.5">
            <Label className="text-xs font-medium" htmlFor={`${baseId}-quality`}>
              Quality
            </Label>
            <div className="flex items-center gap-3 py-1.5">
              <div className="min-w-0 flex-1">
                <Slider
                  id={`${baseId}-quality`}
                  min={0.05}
                  max={1}
                  step={0.01}
                  value={[quality]}
                  onValueChange={(v) => setQuality(v[0] ?? 0.75)}
                  onValueCommit={onQualityCommit}
                  className="[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-thumb]]:size-4 [&_[data-slot=slider-thumb]]:min-h-4 [&_[data-slot=slider-thumb]]:min-w-4 [&_[data-slot=slider-thumb]]:after:-inset-3"
                />
              </div>
              <span
                className="text-muted-foreground min-w-[2.75rem] shrink-0 text-right text-xs tabular-nums"
                aria-live="polite"
              >
                {Math.round(quality * 100)}%
              </span>
            </div>
            <ExportEncodeSizeFootnote
              completedCrop={completedCrop}
              estimatePending={estimatePending}
              estimatedBytes={estimatedBytes}
              originalBytes={originalBytes}
              showQualityCommitHint={completedCrop !== null && estimateNonce === 0}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

type AssetFolderCardProps = {
  baseId: string;
  assetFolders: AssetFolderRow[];
  foldersLoading: boolean;
  folderActionBusy: boolean;
  busy: boolean;
  selectedAssetFolderId: string | null;
  setSelectedAssetFolderId: (id: string | null) => void;
  onCreateAssetFolder: (name: string, parentFolderId: string | null) => Promise<boolean>;
  cmsPrimaryUpload: boolean;
  defaultFolderPathLabel: string | null;
  stepBadgeNumber?: number;
};

function AssetLibraryLocationDescription(p: {
  cmsPrimaryUpload: boolean;
  selectedAssetFolderId: string | null;
  defaultFolderPathLabel: string | null;
}) {
  const { cmsPrimaryUpload, selectedAssetFolderId, defaultFolderPathLabel } = p;
  if (cmsPrimaryUpload) {
    if (!defaultFolderPathLabel) {
      return (
        <>
          A CMS image field needs a URL. Webflow builds that from a new site file, and the Designer only allows that
          after an Assets folder exists. That folder is for Webflow’s file system—not how your collection content is
          organized.
        </>
      );
    }
    return (
      <>
        {selectedAssetFolderId === null ? (
          <>
            Beacon files the new site file under{" "}
            <span className="text-foreground font-medium">{defaultFolderPathLabel}</span> unless you pick a different
            folder below.
          </>
        ) : (
          <>Optional: move the new site file to another folder after upload.</>
        )}
      </>
    );
  }
  return <>Choose where this file is filed. Paths show nested folder names.</>;
}

function getFolderStatusText(assetFolders: AssetFolderRow[], selectedAssetFolderId: string | null): string {
  if (assetFolders.length === 0) {
    return "No folders yet — create one to continue.";
  }

  const folderCountLabel = `${assetFolders.length} folder${assetFolders.length === 1 ? "" : "s"} available`;
  if (selectedAssetFolderId === null) {
    return folderCountLabel;
  }

  const selectedFolderPathLabel = assetFolders.find((folder) => folder.id === selectedAssetFolderId)?.pathLabel;
  if (!selectedFolderPathLabel) {
    return folderCountLabel;
  }
  return `${selectedFolderPathLabel} · ${folderCountLabel}`;
}

type AssetFolderToolbarProps = {
  baseId: string;
  assetFolders: AssetFolderRow[];
  foldersLoading: boolean;
  folderActionBusy: boolean;
  busy: boolean;
  selectedAssetFolderId: string | null;
  setSelectedAssetFolderId: (id: string | null) => void;
  onCreateAssetFolder: (name: string, parentFolderId: string | null) => Promise<boolean>;
};

function AssetFolderToolbar(p: AssetFolderToolbarProps) {
  const {
    baseId,
    assetFolders,
    foldersLoading,
    folderActionBusy,
    busy,
    selectedAssetFolderId,
    setSelectedAssetFolderId,
    onCreateAssetFolder,
  } = p;

  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParent, setNewFolderParent] = useState<"root" | "child">("root");
  const [newFolderParentFolderId, setNewFolderParentFolderId] = useState<string | null>(null);
  const newFolderFieldId = useId();
  const newFolderParentFieldId = `${baseId}-new-folder-parent`;
  const folderFieldId = `${baseId}-asset-folder`;
  const newFolderRootId = `${baseId}-new-folder-root`;
  const newFolderChildId = `${baseId}-new-folder-child`;

  const folderSelectDisabled = folderActionBusy || busy || foldersLoading;
  const newFolderButtonDisabled = folderActionBusy || busy;
  const hasAvailableParentFolders = assetFolders.length > 0;
  const folderStatusText = getFolderStatusText(assetFolders, selectedAssetFolderId);

  const submitNewFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      return;
    }
    const parentFolderId = newFolderParent === "child" ? newFolderParentFolderId : null;
    if (newFolderParent === "child" && !parentFolderId) {
      return;
    }
    const ok = await onCreateAssetFolder(name, parentFolderId);
    if (ok) {
      setNewFolderName("");
      setNewFolderDialogOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <Label className="text-xs font-medium" htmlFor={folderFieldId}>
        Folder
      </Label>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Select
            value={selectedAssetFolderId ?? undefined}
            onValueChange={(v) => {
              setSelectedAssetFolderId(v);
            }}
            disabled={folderSelectDisabled}
          >
            <SelectTrigger id={folderFieldId} size="full">
              <SelectValue placeholder="Choose a folder" />
            </SelectTrigger>
            <SelectContent position="popper" align="start" className="w-(--radix-select-trigger-width)">
              {assetFolders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.pathLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog
          open={newFolderDialogOpen}
          onOpenChange={(open) => {
            setNewFolderDialogOpen(open);
            if (open) {
              setNewFolderName("");
              setNewFolderParent(selectedAssetFolderId ? "child" : "root");
              setNewFolderParentFolderId(selectedAssetFolderId);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="shrink-0"
              aria-label="Create folder"
              disabled={newFolderButtonDisabled}
            >
              <FolderPlus aria-hidden className="size-3.5" />
              <span className="sr-only">Create folder</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm" showCloseButton>
            <DialogHeader>
              <DialogTitle>New folder</DialogTitle>
              <DialogDescription>Name and location.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-1">
              <RadioGroup
                className="flex flex-col gap-2"
                value={newFolderParent}
                onValueChange={(v) => {
                  const nextParent = v as "root" | "child";
                  setNewFolderParent(nextParent);
                  if (nextParent === "child" && !newFolderParentFolderId && hasAvailableParentFolders) {
                    setNewFolderParentFolderId(selectedAssetFolderId ?? assetFolders[0]?.id ?? null);
                  }
                }}
              >
                <label
                  htmlFor={newFolderRootId}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md border border-transparent p-2 hover:bg-muted/50"
                >
                  <RadioGroupItem value="root" id={newFolderRootId} />
                  <span className="text-sm">Top level</span>
                </label>
                <label
                  htmlFor={newFolderChildId}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border border-transparent p-2",
                    hasAvailableParentFolders ? "cursor-pointer hover:bg-muted/50" : "cursor-not-allowed opacity-60"
                  )}
                >
                  <RadioGroupItem value="child" id={newFolderChildId} disabled={!hasAvailableParentFolders} />
                  <span className="text-sm">Inside folder</span>
                </label>
              </RadioGroup>
              {!hasAvailableParentFolders ? (
                <p className="text-muted-foreground text-xs">No folders yet. Create a top-level folder first.</p>
              ) : null}
              {newFolderParent === "child" && hasAvailableParentFolders ? (
                <div className="grid gap-2">
                  <Label className="text-xs" htmlFor={newFolderParentFieldId}>
                    Parent folder
                  </Label>
                  <Select
                    value={newFolderParentFolderId ?? undefined}
                    onValueChange={(v) => setNewFolderParentFolderId(v)}
                    disabled={folderActionBusy}
                  >
                    <SelectTrigger id={newFolderParentFieldId} size="full">
                      <SelectValue placeholder="Choose a parent folder" />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start" className="w-(--radix-select-trigger-width)">
                      {assetFolders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.pathLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="grid gap-2">
                <Label className="text-xs" htmlFor={newFolderFieldId}>
                  Name
                </Label>
                <Input
                  id={newFolderFieldId}
                  placeholder="e.g. Campaign images"
                  value={newFolderName}
                  disabled={folderActionBusy}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submitNewFolder();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter className="flex-row justify-end">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                disabled={
                  folderActionBusy || !newFolderName.trim() || (newFolderParent === "child" && !newFolderParentFolderId)
                }
                onClick={() => void submitNewFolder()}
              >
                {folderActionBusy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {foldersLoading ? (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Loader2 aria-hidden className="size-3.5 shrink-0 animate-spin" />
          Loading folders…
        </p>
      ) : (
        <p className="text-muted-foreground text-xs tabular-nums">{folderStatusText}</p>
      )}
    </div>
  );
}

function AssetDestinationCard(p: AssetFolderCardProps) {
  const {
    baseId,
    assetFolders,
    foldersLoading,
    folderActionBusy,
    busy,
    selectedAssetFolderId,
    setSelectedAssetFolderId,
    onCreateAssetFolder,
    cmsPrimaryUpload,
    defaultFolderPathLabel,
    stepBadgeNumber = 3,
  } = p;

  const hideCardForCmsAutoFile = cmsPrimaryUpload && assetFolders.length > 0 && !foldersLoading;

  if (hideCardForCmsAutoFile) {
    return null;
  }

  const stepLabel = cmsPrimaryUpload ? "Site file (Webflow)" : "Save to Assets";
  const cardTitle = cmsPrimaryUpload ? "Site file for this field" : "Asset library location";

  return (
    <section className="mt-4 flex flex-col gap-3" aria-labelledby={`${baseId}-step-assets`}>
      <h2 className="sr-only" id={`${baseId}-step-assets`}>
        {cmsPrimaryUpload ? "Site file (Webflow)" : "Assets folder"}
      </h2>
      <StepBadge n={stepBadgeNumber} label={stepLabel} />
      <Card size="sm">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-sm font-medium">{cardTitle}</CardTitle>
          <CardDescription className="text-xs leading-snug">
            <AssetLibraryLocationDescription
              cmsPrimaryUpload={cmsPrimaryUpload}
              selectedAssetFolderId={selectedAssetFolderId}
              defaultFolderPathLabel={defaultFolderPathLabel}
            />
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          <AssetFolderToolbar
            baseId={baseId}
            assetFolders={assetFolders}
            foldersLoading={foldersLoading}
            folderActionBusy={folderActionBusy}
            busy={busy}
            selectedAssetFolderId={selectedAssetFolderId}
            setSelectedAssetFolderId={setSelectedAssetFolderId}
            onCreateAssetFolder={onCreateAssetFolder}
          />
        </CardContent>
      </Card>
    </section>
  );
}

type PlacementCardProps = {
  baseId: string;
  placement: PlacementMode;
  setPlacement: (p: PlacementMode) => void;
  replaceLibraryAsset: boolean;
  setReplaceLibraryAsset: (v: boolean) => void;
  componentImageProps: ComponentImagePropOption[];
  selectedComponentImagePropId: string | null;
  setSelectedComponentImagePropId: (id: string | null) => void;
  offerSelectionPlacement: boolean;
  offerReplacePlacement: boolean;
  guestCmsTemplateRestricted: boolean;
};

function PlacementCard(p: PlacementCardProps) {
  const {
    baseId,
    placement,
    setPlacement,
    replaceLibraryAsset,
    setReplaceLibraryAsset,
    componentImageProps,
    selectedComponentImagePropId,
    setSelectedComponentImagePropId,
    offerSelectionPlacement,
    offerReplacePlacement,
    guestCmsTemplateRestricted,
  } = p;

  const placementOptions = PLACEMENT_OPTIONS.filter((o) => {
    if (guestCmsTemplateRestricted) {
      return o.value === "library" || o.value === "download";
    }
    if (o.value === "download") {
      return false;
    }
    if (o.value === "selection") {
      return offerSelectionPlacement;
    }
    if (o.value === "replace") {
      return offerReplacePlacement;
    }
    return true;
  });

  const placementRadioValue = guestCmsTemplateRestricted
    ? placement
    : resolvePlacementWhenOptionHidden(placement, offerSelectionPlacement, offerReplacePlacement);

  return (
    <section className="mt-4 flex flex-col gap-3" aria-labelledby={`${baseId}-step-place`}>
      <h2 className="sr-only" id={`${baseId}-step-place`}>
        Placement
      </h2>
      <StepBadge n={2} label="Save destination" />
      <Card size="sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Placement</CardTitle>
          <CardDescription>Choose how to use this export.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          <RadioGroup
            className="flex flex-col gap-2"
            value={placementRadioValue}
            onValueChange={(v) => setPlacement(v as PlacementMode)}
          >
            {placementOptions.map((opt) => (
              <label
                key={opt.value}
                htmlFor={`${baseId}-place-${opt.value}`}
                className={cn(
                  "flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-transparent p-2.5 ring-1 ring-foreground/10 transition-colors",
                  placementRadioValue === opt.value ? "bg-accent/50 border-primary/30" : "hover:bg-muted/40"
                )}
              >
                <RadioGroupItem id={`${baseId}-place-${opt.value}`} value={opt.value} />
                <span className="min-w-0 flex-1 text-sm font-medium leading-none">{opt.title}</span>
                <InfoTip ariaLabel={`About ${opt.title}`} text={opt.description} />
              </label>
            ))}
          </RadioGroup>

          {placementRadioValue === "replace" ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${baseId}-lib-replace`}
                checked={replaceLibraryAsset}
                onCheckedChange={(v) => setReplaceLibraryAsset(v === true)}
              />
              <Label className="cursor-pointer font-normal" htmlFor={`${baseId}-lib-replace`}>
                Overwrite file in Assets
              </Label>
            </div>
          ) : null}

          {placementRadioValue === "selection" && componentImageProps.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Label className="text-muted-foreground text-xs" htmlFor={`${baseId}-comp-prop`}>
                Component field
              </Label>
              {componentImageProps.length === 1 ? (
                <p className="text-xs leading-snug" id={`${baseId}-comp-prop`}>
                  {componentImageProps[0].label}
                </p>
              ) : (
                <ScrollArea className="max-h-[min(32vh,12rem)] w-full min-h-0 rounded-md border border-border/60 pr-0.5">
                  <RadioGroup
                    className="flex flex-col gap-2 p-1.5"
                    id={`${baseId}-comp-prop`}
                    value={selectedComponentImagePropId ?? ""}
                    onValueChange={(v) => setSelectedComponentImagePropId(v)}
                  >
                    {componentImageProps.map((o) => (
                      <div key={o.propId} className="flex min-w-0 items-center gap-2">
                        <RadioGroupItem value={o.propId} id={`${baseId}-comp-${o.propId}`} className="shrink-0" />
                        <Label className="min-w-0 font-normal" htmlFor={`${baseId}-comp-${o.propId}`}>
                          {o.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </ScrollArea>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

export function ImageEditorCropExportPanel(props: ImageEditorCropExportPanelProps) {
  const {
    baseId,
    imageSrc,
    cropAspect,
    crop,
    setCrop,
    zoom,
    setZoom,
    onCropComplete,
    cropFrameMode,
    setCropFrameMode,
    aspectPreset,
    setAspectPreset,
    visibleBuiltinAspectPresets,
    widthStr,
    setWidthStr,
    outputWidth,
    setOutputWidth,
    heightStr,
    setHeightStr,
    outputHeight,
    setOutputHeight,
    fileBaseName,
    setFileBaseName,
    quality,
    setQuality,
    onQualityCommit,
    exportFormat,
    allowAvifEncoding,
    setExportFormat,
    onExportFormatCommit,
    completedCrop,
    estimatePending,
    estimatedBytes,
    originalBytes,
    estimateNonce,
    originalPreviewUrl,
    compressedPreviewUrl,
    previewPending,
    assetFolders,
    foldersLoading,
    folderActionBusy,
    selectedAssetFolderId,
    setSelectedAssetFolderId,
    onCreateAssetFolder,
    placement,
    setPlacement,
    replaceLibraryAsset,
    setReplaceLibraryAsset,
    componentImageProps,
    selectedComponentImagePropId,
    setSelectedComponentImagePropId,
    selectedElementType,
    componentImagePropsResolving,
    cmsPrimaryUpload,
    elementCmsBindingLoading,
    elementCmsBinding,
    guestCmsTemplateRestricted,
    busy,
    onApplyToCanvas,
    exportPlaceBlockedLabel,
    parsedExportWidth,
    parsedExportHeight,
    effectiveExportWidth,
    effectiveExportHeight,
    onOpenQualityPopout,
    limitCropZoomToNativeResolution,
    flowPhase,
    onContinueToSave,
    unifiedPositionAndSave = false,
    frameSummary,
  } = props;

  const defaultFolderPathLabel = assetFolders[0]?.pathLabel ?? null;

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

  const resolvedPlacement = useMemo(() => {
    let p = resolvePlacementWhenOptionHidden(placement, offerSelectionPlacement, offerReplacePlacement);
    if (guestCmsTemplateRestricted) {
      if (p !== "library" && p !== "download") {
        p = "library";
      }
    } else if (p === "download") {
      p = "library";
    }
    return p;
  }, [placement, offerSelectionPlacement, offerReplacePlacement, guestCmsTemplateRestricted]);

  useLayoutEffect(() => {
    if (resolvedPlacement !== placement) {
      setPlacement(resolvedPlacement);
    }
  }, [resolvedPlacement, placement, setPlacement]);

  const placeButton = useMemo(
    () =>
      placeButtonStateForPlacement({
        exportPlaceBlockedLabel,
        busy,
        foldersLoading,
        assetFolderCount: assetFolders.length,
        selectedAssetFolderId,
        cmsPrimaryUpload,
        elementCmsBindingLoading,
        completedCrop,
        placement: resolvedPlacement,
        selectedElementType,
        componentImagePropsResolving,
        componentImagePropCount: componentImageProps.length,
        selectedComponentImagePropId,
      }),
    [
      exportPlaceBlockedLabel,
      busy,
      foldersLoading,
      assetFolders.length,
      selectedAssetFolderId,
      cmsPrimaryUpload,
      elementCmsBindingLoading,
      completedCrop,
      resolvedPlacement,
      selectedElementType,
      componentImagePropsResolving,
      componentImageProps.length,
      selectedComponentImagePropId,
    ]
  );

  const [belowCropEntered, setBelowCropEntered] = useState(false);

  useLayoutEffect(() => {
    void imageSrc;
    setBelowCropEntered(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setBelowCropEntered(true);
      });
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [imageSrc]);

  useEffect(() => {
    if (placement !== "replace") {
      setReplaceLibraryAsset(false);
    }
  }, [placement, setReplaceLibraryAsset]);

  if (flowPhase === "position" && unifiedPositionAndSave) {
    return (
      <>
        <CropStageSection
          baseId={baseId}
          imageSrc={imageSrc}
          cropAspect={cropAspect}
          crop={crop}
          setCrop={setCrop}
          zoom={zoom}
          setZoom={setZoom}
          onCropComplete={onCropComplete}
          belowCropEntered={belowCropEntered}
          cropFrameMode={cropFrameMode}
          setCropFrameMode={setCropFrameMode}
          aspectPreset={aspectPreset}
          setAspectPreset={setAspectPreset}
          visibleBuiltinAspectPresets={visibleBuiltinAspectPresets}
          widthStr={widthStr}
          setWidthStr={setWidthStr}
          outputWidth={outputWidth}
          setOutputWidth={setOutputWidth}
          heightStr={heightStr}
          setHeightStr={setHeightStr}
          outputHeight={outputHeight}
          setOutputHeight={setOutputHeight}
          limitCropZoomToNativeResolution={limitCropZoomToNativeResolution}
          positionOnly
          showPositionStepBadge
          frameSummary={frameSummary}
        />
        <ExportEncodeCard
          baseId={baseId}
          fileBaseName={fileBaseName}
          setFileBaseName={setFileBaseName}
          quality={quality}
          setQuality={setQuality}
          onQualityCommit={onQualityCommit}
          exportFormat={exportFormat}
          allowAvifEncoding={allowAvifEncoding}
          setExportFormat={setExportFormat}
          onExportFormatCommit={onExportFormatCommit}
          completedCrop={completedCrop}
          estimatePending={estimatePending}
          estimatedBytes={estimatedBytes}
          originalBytes={originalBytes}
          estimateNonce={estimateNonce}
          originalPreviewUrl={originalPreviewUrl}
          compressedPreviewUrl={compressedPreviewUrl}
          previewPending={previewPending}
          parsedExportWidth={parsedExportWidth}
          parsedExportHeight={parsedExportHeight}
          effectiveExportWidth={effectiveExportWidth}
          effectiveExportHeight={effectiveExportHeight}
          onOpenQualityPopout={onOpenQualityPopout}
          stepBadgeNumber={2}
        />

        {resolvedPlacement === "download" ? null : (
          <AssetDestinationCard
            baseId={baseId}
            assetFolders={assetFolders}
            foldersLoading={foldersLoading}
            folderActionBusy={folderActionBusy}
            busy={busy}
            selectedAssetFolderId={selectedAssetFolderId}
            setSelectedAssetFolderId={setSelectedAssetFolderId}
            onCreateAssetFolder={onCreateAssetFolder}
            cmsPrimaryUpload={cmsPrimaryUpload}
            defaultFolderPathLabel={defaultFolderPathLabel}
            stepBadgeNumber={3}
          />
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button
            type="button"
            className="w-full"
            disabled={placeButton.disabled}
            onClick={() => void onApplyToCanvas()}
          >
            {placeButton.busy ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                {placeButton.label}
              </>
            ) : (
              <>
                <Crop aria-hidden className="size-4" />
                {placeButton.label}
              </>
            )}
          </Button>
        </div>
      </>
    );
  }

  if (flowPhase === "position") {
    return (
      <>
        <CropStageSection
          baseId={baseId}
          imageSrc={imageSrc}
          cropAspect={cropAspect}
          crop={crop}
          setCrop={setCrop}
          zoom={zoom}
          setZoom={setZoom}
          onCropComplete={onCropComplete}
          belowCropEntered={belowCropEntered}
          cropFrameMode={cropFrameMode}
          setCropFrameMode={setCropFrameMode}
          aspectPreset={aspectPreset}
          setAspectPreset={setAspectPreset}
          visibleBuiltinAspectPresets={visibleBuiltinAspectPresets}
          widthStr={widthStr}
          setWidthStr={setWidthStr}
          outputWidth={outputWidth}
          setOutputWidth={setOutputWidth}
          heightStr={heightStr}
          setHeightStr={setHeightStr}
          outputHeight={outputHeight}
          setOutputHeight={setOutputHeight}
          limitCropZoomToNativeResolution={limitCropZoomToNativeResolution}
          positionOnly
          frameSummary={frameSummary}
        />
        <div className="mt-4 flex flex-col gap-2 px-4">
          <Button type="button" className="w-full" disabled={!completedCrop} onClick={onContinueToSave}>
            Next: review &amp; save
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <ExportEncodeCard
        baseId={baseId}
        fileBaseName={fileBaseName}
        setFileBaseName={setFileBaseName}
        quality={quality}
        setQuality={setQuality}
        onQualityCommit={onQualityCommit}
        exportFormat={exportFormat}
        allowAvifEncoding={allowAvifEncoding}
        setExportFormat={setExportFormat}
        onExportFormatCommit={onExportFormatCommit}
        completedCrop={completedCrop}
        estimatePending={estimatePending}
        estimatedBytes={estimatedBytes}
        originalBytes={originalBytes}
        estimateNonce={estimateNonce}
        originalPreviewUrl={originalPreviewUrl}
        compressedPreviewUrl={compressedPreviewUrl}
        previewPending={previewPending}
        parsedExportWidth={parsedExportWidth}
        parsedExportHeight={parsedExportHeight}
        effectiveExportWidth={effectiveExportWidth}
        effectiveExportHeight={effectiveExportHeight}
        onOpenQualityPopout={onOpenQualityPopout}
      />

      <PlacementCard
        baseId={baseId}
        placement={placement}
        setPlacement={setPlacement}
        replaceLibraryAsset={replaceLibraryAsset}
        setReplaceLibraryAsset={setReplaceLibraryAsset}
        componentImageProps={componentImageProps}
        selectedComponentImagePropId={selectedComponentImagePropId}
        setSelectedComponentImagePropId={setSelectedComponentImagePropId}
        offerSelectionPlacement={offerSelectionPlacement}
        offerReplacePlacement={offerReplacePlacement}
        guestCmsTemplateRestricted={guestCmsTemplateRestricted}
      />

      {resolvedPlacement === "download" ? null : (
        <AssetDestinationCard
          baseId={baseId}
          assetFolders={assetFolders}
          foldersLoading={foldersLoading}
          folderActionBusy={folderActionBusy}
          busy={busy}
          selectedAssetFolderId={selectedAssetFolderId}
          setSelectedAssetFolderId={setSelectedAssetFolderId}
          onCreateAssetFolder={onCreateAssetFolder}
          cmsPrimaryUpload={cmsPrimaryUpload}
          defaultFolderPathLabel={defaultFolderPathLabel}
        />
      )}

      <div className="mt-6 flex flex-col gap-2">
        <Button type="button" className="w-full" disabled={placeButton.disabled} onClick={() => void onApplyToCanvas()}>
          {placeButton.busy ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" />
              {placeButton.label}
            </>
          ) : (
            <>
              <Crop aria-hidden className="size-4" />
              {placeButton.label}
            </>
          )}
        </Button>
      </div>
    </>
  );
}
