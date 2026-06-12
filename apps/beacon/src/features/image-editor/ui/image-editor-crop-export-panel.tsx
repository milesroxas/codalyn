import type { ImageExportFormat, ResolvedUploadTarget, ResolverOutput } from "@codalyn/webflow-kit";
import { FolderPlus, Info, Loader2 } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useState } from "react";
import type { Area, MediaSize } from "react-easy-crop";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import type { PlacementMode } from "@/features/image-editor/lib/apply-cropped-export";
import {
  parseOutputDimension,
  parseOutputDimensionStrict,
  sanitizeDimensionDigitsInput,
} from "@/features/image-editor/lib/apply-cropped-export";
import { type AspectPreset, aspectLabels, type EditorAspectSelection } from "@/features/image-editor/lib/aspect-preset";
import type { AssetFolderRow } from "@/features/image-editor/lib/asset-folder-row";
import type { ElementCmsBindingResolution } from "@/features/image-editor/lib/cms-primary-upload-context";
import type { ComponentImagePropOption } from "@/features/image-editor/lib/component-image-prop";
import { formatFileSize } from "@/features/image-editor/lib/format-file-size";
import type { ImageEditorNaturalSizeAdvisory } from "@/features/image-editor/lib/image-editor-natural-size-advisory";
import {
  resolvePlacementWhenOptionHidden,
  shouldOfferReplacePlacement,
  shouldOfferSelectionPlacement,
} from "@/features/image-editor/lib/image-editor-placement-readiness";
import type { ImageEditorPresetFileLimitBlocker } from "@/features/image-editor/lib/image-editor-preset-file-limit-blocker";
import { resolveImageEditorPlacement } from "@/features/image-editor/lib/image-editor-resolved-placement";
import { sanitizeAssetBaseName } from "@/features/image-editor/lib/sanitize-asset-base-name";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { AvifTowerLimitFallbackNotice } from "@/features/image-editor/ui/avif-tower-limit-fallback-notice";
import { ExportEncodeSizeFootnote, ExportPresetLimitBar } from "@/features/image-editor/ui/export-size-estimate";
import { ImagePageTargetSurfaceSummary } from "@/features/image-editor/ui/image-editor-page-target-surface-summary";
import { QualityComparePreview } from "@/features/image-editor/ui/quality-compare-preview";
import { beaconPanelContainClass } from "@/shared/lib/beacon-app-route-surface";
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
import { Empty, EmptyAction, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/shared/ui/empty";
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
          "text-muted-foreground hover:text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
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

export type { AspectPreset, AssetFolderRow, ComponentImagePropOption, EditorAspectSelection };

export type UploadPresetPickerOption = {
  id: string;
  label: string;
};

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
  aspectPreset: EditorAspectSelection;
  setAspectPreset: (p: EditorAspectSelection) => void;
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
  /** When false, “Next: review & save” on the two-step path stays disabled. */
  exportDimensionsReady?: boolean;
  /** When true, empty W×H fields are invalid (no numeric fallback) on blur. */
  strictOutputDimensionInputs?: boolean;
  parsedExportWidth: number;
  parsedExportHeight: number;
  effectiveExportWidth: number;
  effectiveExportHeight: number;
  exportPreviewReady: boolean;
  onOpenQualityPopout: () => void;
  limitCropZoomToNativeResolution: boolean;
  /** `position` — crop and zoom only; `save` — encoding, placement, and primary action. */
  flowPhase: "position" | "save";
  /** Auto path: placement was chosen on Target; hide placement controls on Save. */
  hidePlacementCard?: boolean;
  frameSummary: string;
  /**
   * No designer export attributes on the image: show aspect presets plus max width; height is derived from the
   * chosen aspect and max width.
   */
  exportSizeUsesAspectAndMaxWidth?: boolean;
  onExportMaxWidthBlur?: () => void;
  showResolvedReadout?: boolean;
  resolvedUploadTarget?: ResolvedUploadTarget | null;
  resolvedConstraintsReadout?: ResolverOutput | null;
  sessionMaxFileSizeBytes?: number | null;
  presetFileLimitBlocker?: ImageEditorPresetFileLimitBlocker | null;
  naturalSizeAdvisory?: ImageEditorNaturalSizeAdvisory | null;
  onDismissNaturalSizeAdvisory?: () => void;
  onApplyNaturalSizeSuggestion?: () => void;
  uploadPresetPickerVisible?: boolean;
  uploadPresetPickerReadOnly?: boolean;
  uploadPresetPickerValue?: string;
  uploadPresetPickerOptions?: UploadPresetPickerOption[];
  onUploadPresetPickerChange?: (value: string) => void;
  /** When true, preset export format is fixed and file-type controls are hidden. */
  exportFormatLocked?: boolean;
  /** AVIF preset forced to WebP because Tower image optimize limit was reached. */
  avifPresetOverriddenByTowerLimit?: boolean;
  /** When true, show aspect ratio and export dimension controls (manual override). */
  showExportSizeControls?: boolean;
  /** Auto path: show selected image/component on the position step for context. */
  positionPageTarget?: ImagePageTarget | null;
};

/** Fade controls below the crop preview; opacity-only so layout width stays stable in the extension iframe. */
function staggerBelowCropClass(entered: boolean, delayMs: number) {
  return cn(
    "transition-opacity duration-300 ease-out",
    entered ? "opacity-100" : "opacity-0 [transition-delay:0ms]",
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
  aspectPreset: EditorAspectSelection;
  setAspectPreset: (p: EditorAspectSelection) => void;
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
  strictOutputDimensionInputs?: boolean;
  frameSummary: string;
  exportSizeUsesAspectAndMaxWidth?: boolean;
  onExportMaxWidthBlur?: () => void;
  showExportSizeControls?: boolean;
  naturalSizeAdvisory: ImageEditorNaturalSizeAdvisory | null;
  onDismissNaturalSizeAdvisory: () => void;
  onApplyNaturalSizeSuggestion: () => void;
};

type CropShapeControlsSectionProps = Pick<
  CropStageProps,
  | "baseId"
  | "belowCropEntered"
  | "exportSizeUsesAspectAndMaxWidth"
  | "cropFrameMode"
  | "setCropFrameMode"
  | "aspectPreset"
  | "setAspectPreset"
  | "visibleBuiltinAspectPresets"
  | "widthStr"
  | "setWidthStr"
  | "outputWidth"
  | "setOutputWidth"
  | "heightStr"
  | "setHeightStr"
  | "outputHeight"
  | "setOutputHeight"
  | "onExportMaxWidthBlur"
  | "strictOutputDimensionInputs"
>;

function formatDimensionPair(size: { width: number; height: number }): string {
  return `${size.width}×${size.height}px`;
}

function NaturalSizeAdvisoryCard(props: {
  advisory: ImageEditorNaturalSizeAdvisory;
  onDismiss: () => void;
  onApply: () => void;
}) {
  const { advisory, onDismiss, onApply } = props;
  const comparisonLabel =
    advisory.comparisonKind === "source-larger"
      ? "Source image is much larger than current export size."
      : "Source image is much smaller than current export size.";
  return (
    <Card size="sm">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-sm font-medium">Advisory sizing</CardTitle>
        <CardDescription className="text-xs leading-snug">{comparisonLabel}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <p className="text-muted-foreground">Source natural size</p>
          <p className="tabular-nums">{formatDimensionPair(advisory.natural)}</p>
          <p className="text-muted-foreground">Current export size</p>
          <p className="tabular-nums">{formatDimensionPair(advisory.comparison)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {advisory.canApplySuggestion ? (
            <Button type="button" size="sm" onClick={onApply}>
              Use source size
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CropShapeControlsSection(p: CropShapeControlsSectionProps) {
  const {
    baseId,
    belowCropEntered,
    exportSizeUsesAspectAndMaxWidth,
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
    onExportMaxWidthBlur,
    strictOutputDimensionInputs = false,
  } = p;

  return (
    <div className={staggerBelowCropClass(belowCropEntered, 90)}>
      <div className="flex min-w-0 flex-col gap-3 rounded-sm border border-border/70 bg-muted/20 p-3">
        <div className="flex min-h-5 items-center gap-1">
          <Label className="text-xs font-medium leading-none" htmlFor={`${baseId}-frame-mode`}>
            Crop shape
          </Label>
          <InfoTip
            ariaLabel="About crop shape"
            text={
              exportSizeUsesAspectAndMaxWidth
                ? "Aspect ratios lock the crop mask. Set max width; export height follows the ratio."
                : "Aspect ratios lock the crop mask. Custom uses the width and height fields below for the crop shape."
            }
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
          <ToggleGroupItem value="aspect" className="flex-1 justify-center">
            Aspect ratios
          </ToggleGroupItem>
          <ToggleGroupItem value="custom" className="flex-1 justify-center">
            Custom
          </ToggleGroupItem>
        </ToggleGroup>
        {cropFrameMode === "aspect" ? (
          <>
            <ToggleGroup
              id={`${baseId}-aspect`}
              className={cn(
                "grid w-full min-w-0 gap-1.5",
                visibleBuiltinAspectPresets.length > 3 ? "grid-cols-2" : "grid-cols-3"
              )}
              type="single"
              value={aspectPreset === "unset" ? undefined : aspectPreset}
              onValueChange={(v) => {
                if (v) {
                  setAspectPreset(v as AspectPreset);
                }
              }}
              variant="outline"
              size="sm"
              spacing={1.5}
            >
              {visibleBuiltinAspectPresets.map((preset, index) => {
                const isLastOdd =
                  visibleBuiltinAspectPresets.length % 2 === 1 &&
                  index === visibleBuiltinAspectPresets.length - 1 &&
                  visibleBuiltinAspectPresets.length > 3;
                return (
                  <ToggleGroupItem
                    key={preset}
                    value={preset}
                    className={cn("h-7 w-full justify-center text-center leading-tight", isLastOdd && "col-span-2")}
                  >
                    {aspectLabels[preset]}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
            {exportSizeUsesAspectAndMaxWidth ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex min-h-5 items-center gap-1">
                    <Label className="text-xs font-medium leading-none" htmlFor={`${baseId}-aspect-max-w`}>
                      Max width (px)
                    </Label>
                    <InfoTip
                      ariaLabel="About max width"
                      text="Export width in pixels. Height is computed from the aspect and max width."
                    />
                  </div>
                  <Input
                    id={`${baseId}-aspect-max-w`}
                    aria-label="Max export width in pixels"
                    inputMode="numeric"
                    type="text"
                    value={widthStr}
                    onChange={(e) => setWidthStr(sanitizeDimensionDigitsInput(e.target.value))}
                    onBlur={() => {
                      onExportMaxWidthBlur?.();
                    }}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex min-h-5 items-center gap-1">
                    <Label className="text-xs font-medium leading-none" htmlFor={`${baseId}-aspect-derived-h`}>
                      Height (px)
                    </Label>
                    <InfoTip
                      ariaLabel="About export height"
                      text="Computed from the selected aspect ratio and max width."
                    />
                  </div>
                  <Input
                    id={`${baseId}-aspect-derived-h`}
                    aria-label="Export height in pixels, from aspect and max width"
                    inputMode="numeric"
                    type="text"
                    readOnly
                    tabIndex={-1}
                    className="bg-muted/40 tabular-nums"
                    value={heightStr}
                  />
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex min-h-5 items-center gap-1">
                <Label className="text-xs font-medium leading-none" htmlFor={`${baseId}-ow`}>
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
                onChange={(e) => setWidthStr(sanitizeDimensionDigitsInput(e.target.value))}
                onBlur={() => {
                  if (strictOutputDimensionInputs) {
                    const w = parseOutputDimensionStrict(widthStr);
                    if (w == null) {
                      return;
                    }
                    setOutputWidth(w);
                    setWidthStr(String(w));
                    return;
                  }
                  const w = parseOutputDimension(widthStr, outputWidth);
                  setOutputWidth(w);
                  setWidthStr(String(w));
                }}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex min-h-5 items-center gap-1">
                <Label className="text-xs font-medium leading-none" htmlFor={`${baseId}-oh`}>
                  Height (px)
                </Label>
                <InfoTip ariaLabel="About output dimensions" text="Use values from 1 to 8192 px per side." />
              </div>
              <Input
                id={`${baseId}-oh`}
                aria-label="Output height in pixels"
                inputMode="numeric"
                type="text"
                value={heightStr}
                onChange={(e) => setHeightStr(sanitizeDimensionDigitsInput(e.target.value))}
                onBlur={() => {
                  if (strictOutputDimensionInputs) {
                    const h = parseOutputDimensionStrict(heightStr);
                    if (h == null) {
                      return;
                    }
                    setOutputHeight(h);
                    setHeightStr(String(h));
                    return;
                  }
                  const h = parseOutputDimension(heightStr, outputHeight);
                  setOutputHeight(h);
                  setHeightStr(String(h));
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
    frameSummary,
    exportSizeUsesAspectAndMaxWidth = false,
    onExportMaxWidthBlur,
    strictOutputDimensionInputs = false,
    showExportSizeControls = false,
    naturalSizeAdvisory,
    onDismissNaturalSizeAdvisory,
    onApplyNaturalSizeSuggestion,
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
        {positionOnly ? "Position image" : "Crop"}
      </h2>
      <Card size="sm">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-sm font-medium">{positionOnly ? "Position" : "Crop area"}</CardTitle>
          <CardDescription className="min-w-0 text-xs leading-relaxed wrap-break-word">
            {positionOnly ? frameSummary : "Drag to frame what you export."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4 pt-0">
          <div
            data-slot="image-editor-cropper"
            className="relative h-64 w-full min-w-0 overflow-hidden rounded-sm border-2 border-dashed border-border bg-muted/30"
          >
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
              style={{ containerStyle: { width: "100%", height: "100%" } }}
            />
          </div>

          <div className={staggerBelowCropClass(belowCropEntered, 0)}>
            <div className="flex min-w-0 flex-col gap-2.5 rounded-sm border border-border/70 bg-muted/20 p-3">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <Label className="text-xs font-medium" htmlFor={`${baseId}-zoom`}>
                  Zoom
                </Label>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
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

          {showExportSizeControls ? (
            <CropShapeControlsSection
              baseId={baseId}
              belowCropEntered={belowCropEntered}
              exportSizeUsesAspectAndMaxWidth={exportSizeUsesAspectAndMaxWidth}
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
              onExportMaxWidthBlur={onExportMaxWidthBlur}
              strictOutputDimensionInputs={strictOutputDimensionInputs}
            />
          ) : null}
        </CardContent>
      </Card>
      {naturalSizeAdvisory ? (
        <NaturalSizeAdvisoryCard
          advisory={naturalSizeAdvisory}
          onDismiss={onDismissNaturalSizeAdvisory}
          onApply={onApplyNaturalSizeSuggestion}
        />
      ) : null}
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
  exportPreviewReady: boolean;
  onOpenQualityPopout: () => void;
  presetFileLimitBlocker: ImageEditorPresetFileLimitBlocker | null;
  exportFormatLocked?: boolean;
  avifPresetOverriddenByTowerLimit?: boolean;
};

function UploadPresetPickerCard(props: {
  uploadPresetPickerValue?: string;
  onUploadPresetPickerChange?: (value: string) => void;
  uploadPresetPickerReadOnly: boolean;
  uploadPresetPickerOptions: UploadPresetPickerOption[];
  showAvifLimitNotice: boolean;
}) {
  const {
    uploadPresetPickerValue,
    onUploadPresetPickerChange,
    uploadPresetPickerReadOnly,
    uploadPresetPickerOptions,
    showAvifLimitNotice,
  } = props;

  return (
    <Card size="sm">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-sm font-medium">Upload preset</CardTitle>
        <CardDescription className="text-xs leading-snug">
          Choose the resolved preset, site default, or manual override.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        <Select
          value={uploadPresetPickerValue}
          onValueChange={(value) => onUploadPresetPickerChange?.(value)}
          disabled={uploadPresetPickerReadOnly}
        >
          <SelectTrigger size="full">
            <SelectValue placeholder="Select upload preset source" />
          </SelectTrigger>
          <SelectContent position="popper" align="start" className="w-(--radix-select-trigger-width)">
            {uploadPresetPickerOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showAvifLimitNotice ? <AvifTowerLimitFallbackNotice /> : null}
      </CardContent>
    </Card>
  );
}

function ExportFormatFields(props: {
  baseId: string;
  exportFormat: ImageExportFormat;
  allowAvifEncoding: boolean;
  setExportFormat: (f: ImageExportFormat) => void;
  onExportFormatCommit: () => void;
  exportFormatLocked: boolean;
  avifPresetOverriddenByTowerLimit: boolean;
}) {
  const {
    baseId,
    exportFormat,
    allowAvifEncoding,
    setExportFormat,
    onExportFormatCommit,
    exportFormatLocked,
    avifPresetOverriddenByTowerLimit,
  } = props;

  if (exportFormatLocked && !avifPresetOverriddenByTowerLimit) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Label className="text-xs font-medium" id={`${baseId}-format`}>
          File type
        </Label>
        {allowAvifEncoding && !avifPresetOverriddenByTowerLimit ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
      {avifPresetOverriddenByTowerLimit ? (
        <>
          <div className="text-foreground rounded-sm border border-border/60 bg-muted/20 px-3 py-2 text-sm font-medium">
            WebP
          </div>
          <AvifTowerLimitFallbackNotice />
        </>
      ) : allowAvifEncoding ? (
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
          <ToggleGroupItem value="webp" className="text-xs font-medium">
            WebP
          </ToggleGroupItem>
          <ToggleGroupItem value="avif" className="text-xs font-medium">
            AVIF
          </ToggleGroupItem>
        </ToggleGroup>
      ) : (
        <>
          <div className="text-foreground rounded-sm border border-border/60 bg-muted/20 px-3 py-2 text-sm font-medium">
            WebP
          </div>
          <p className="text-muted-foreground text-[10px] leading-snug">Sign in to Tower to enable AVIF.</p>
        </>
      )}
    </div>
  );
}

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
    exportPreviewReady,
    onOpenQualityPopout,
    presetFileLimitBlocker,
    exportFormatLocked = false,
    avifPresetOverriddenByTowerLimit = false,
  } = p;

  const exportW = completedCrop ? effectiveExportWidth : parsedExportWidth;
  const exportH = completedCrop ? effectiveExportHeight : parsedExportHeight;

  return (
    <section className="mt-4 flex flex-col gap-3" aria-labelledby={`${baseId}-step-export`}>
      <h2 className="sr-only" id={`${baseId}-step-export`}>
        Encode
      </h2>
      <Card size="sm">
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-sm font-medium">Encode & save</CardTitle>
          <CardDescription className="min-w-0 text-xs leading-snug wrap-break-word">
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
        <CardContent className="flex min-w-0 flex-col gap-5 pt-0">
          <div className="flex min-w-0 flex-col gap-1.5">
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

          <ExportFormatFields
            baseId={baseId}
            exportFormat={exportFormat}
            allowAvifEncoding={allowAvifEncoding}
            setExportFormat={setExportFormat}
            onExportFormatCommit={onExportFormatCommit}
            exportFormatLocked={exportFormatLocked}
            avifPresetOverriddenByTowerLimit={avifPresetOverriddenByTowerLimit}
          />

          <div className="flex flex-col gap-2">
            {completedCrop && exportPreviewReady ? (
              <QualityComparePreview
                originalSrc={originalPreviewUrl}
                compressedSrc={compressedPreviewUrl}
                pending={previewPending}
                exportWidth={effectiveExportWidth}
                exportHeight={effectiveExportHeight}
                onOpenQualityPopout={onOpenQualityPopout}
              />
            ) : completedCrop ? (
              <div className="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center">
                <p className="text-muted-foreground text-xs font-medium">Set export size to preview</p>
                <p className="text-muted-foreground max-w-[16rem] text-[10px] leading-snug">
                  Choose an aspect ratio and max width, or enter custom width and height in the crop step.
                </p>
              </div>
            ) : (
              <div className="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border/70 bg-muted/15 px-4 py-6 text-center">
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
            {presetFileLimitBlocker ? (
              <div className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2">
                <p className="text-sm font-medium text-destructive">Over active preset file-size limit.</p>
                <p className="text-muted-foreground mt-1 text-xs leading-snug">
                  Estimated {formatFileSize(presetFileLimitBlocker.estimatedBytes)} exceeds cap{" "}
                  {formatFileSize(presetFileLimitBlocker.maxFileSizeBytes)}. Reduce quality or dimensions.
                </p>
                <ExportPresetLimitBar
                  className="mt-2"
                  estimatedBytes={presetFileLimitBlocker.estimatedBytes}
                  maxBytes={presetFileLimitBlocker.maxFileSizeBytes}
                />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function ResolvedConstraintsReadOnlyCard(props: {
  target: ResolvedUploadTarget | null;
  readout: ResolverOutput | null;
  sessionMaxFileSizeBytes: number | null;
}) {
  const { target, readout, sessionMaxFileSizeBytes } = props;
  const constraints = readout?.constraints ?? null;
  const blockers = readout?.blockers ?? [];
  return (
    <section className="mt-4 flex flex-col gap-3" aria-labelledby="resolved-export-constraints-readonly">
      <h2 className="sr-only" id="resolved-export-constraints-readonly">
        Resolved constraints
      </h2>
      <Card size="sm">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-sm font-medium">Resolved constraints (read-only)</CardTitle>
          <CardDescription className="text-xs leading-snug">
            Debug view only. Current export fields remain unchanged in this phase.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-0 text-xs">
          <p className="text-muted-foreground">Target</p>
          <p className="tabular-nums">{target?.kind ?? "none"}</p>
          <p className="text-muted-foreground">Source</p>
          <p className="tabular-nums">{readout?.source ?? "manual"}</p>
          <p className="text-muted-foreground">Size</p>
          <p className="tabular-nums">{constraints ? `${constraints.width}×${constraints.height}` : "—"}</p>
          <p className="text-muted-foreground">Format</p>
          <p className="tabular-nums">{constraints?.exportFormat ?? "—"}</p>
          <p className="text-muted-foreground">Max file size</p>
          <p className="tabular-nums">
            {constraints?.maxFileSizeBytes == null ? "—" : `${constraints.maxFileSizeBytes.toLocaleString()} B`}
          </p>
          <p className="text-muted-foreground">Session max file size</p>
          <p className="tabular-nums">
            {sessionMaxFileSizeBytes == null ? "—" : `${sessionMaxFileSizeBytes.toLocaleString()} B`}
          </p>
          <p className="text-muted-foreground">Preset id</p>
          <p className="tabular-nums">{readout?.presetId ?? "—"}</p>
          <p className="text-muted-foreground">Blockers</p>
          <p className="tabular-nums">{blockers.length === 0 ? "none" : blockers.join(", ")}</p>
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

function AssetFolderFieldLabel({ folderFieldId }: { folderFieldId: string }) {
  return (
    <Label className="text-xs font-medium" htmlFor={folderFieldId}>
      Folder
    </Label>
  );
}

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
  const showFoldersLoading = useDeferredLoadingIndicator(foldersLoading);

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
  const showEmptyFolderState = !showFoldersLoading && assetFolders.length === 0;
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
      <div className="flex flex-col gap-2.5">
        {showFoldersLoading ? (
          <>
            <AssetFolderFieldLabel folderFieldId={folderFieldId} />
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Loader2 aria-hidden className="size-3.5 shrink-0 animate-spin" />
              Loading folders…
            </p>
          </>
        ) : showEmptyFolderState ? (
          <Empty tone="insetPanel" layout="horizontalStacked">
            <EmptyHeader>
              <EmptyTitle>No folders yet</EmptyTitle>
              <EmptyDescription size="compact">Create a folder to continue.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent layout="actions">
              <DialogTrigger asChild>
                <EmptyAction disabled={newFolderButtonDisabled}>Create folder</EmptyAction>
              </DialogTrigger>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <AssetFolderFieldLabel folderFieldId={folderFieldId} />
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
            </div>
            <p className="text-muted-foreground text-xs tabular-nums">{folderStatusText}</p>
          </>
        )}
      </div>
      <DialogContent className="sm:max-w-sm" showCloseButton>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>Choose where this folder should live, then give it a name.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          {hasAvailableParentFolders ? (
            <RadioGroup
              className="flex flex-col gap-2"
              value={newFolderParent}
              onValueChange={(v) => {
                const nextParent = v as "root" | "child";
                setNewFolderParent(nextParent);
                if (nextParent === "child" && !newFolderParentFolderId) {
                  setNewFolderParentFolderId(selectedAssetFolderId ?? assetFolders[0]?.id ?? null);
                }
              }}
            >
              <label
                htmlFor={newFolderRootId}
                className="flex cursor-pointer items-center gap-2.5 rounded-sm border border-transparent p-2 hover:bg-muted/50"
              >
                <RadioGroupItem value="root" id={newFolderRootId} />
                <span className="text-sm">Top level</span>
              </label>
              <label
                htmlFor={newFolderChildId}
                className="flex cursor-pointer items-center gap-2.5 rounded-sm border border-transparent p-2 hover:bg-muted/50"
              >
                <RadioGroupItem value="child" id={newFolderChildId} />
                <span className="text-sm">Inside folder</span>
              </label>
            </RadioGroup>
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
  } = p;

  if (cmsPrimaryUpload) {
    return null;
  }

  const cardTitle = "Asset library location";

  return (
    <section className="mt-4 flex flex-col gap-3" aria-labelledby={`${baseId}-step-assets`}>
      <h2 className="sr-only" id={`${baseId}-step-assets`}>
        Assets folder
      </h2>
      <Card size="sm">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-sm font-medium">{cardTitle}</CardTitle>
          <CardDescription className="min-w-0 text-xs leading-snug wrap-break-word">
            <AssetLibraryLocationDescription
              cmsPrimaryUpload={cmsPrimaryUpload}
              selectedAssetFolderId={selectedAssetFolderId}
              defaultFolderPathLabel={defaultFolderPathLabel}
            />
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4 pt-0">
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
      <Card size="sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Placement</CardTitle>
          <CardDescription className="min-w-0 wrap-break-word">Choose how to use this export.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4 pt-0">
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
                  "flex min-w-0 cursor-pointer items-center gap-3 rounded-sm border border-transparent p-2.5 ring-1 ring-foreground/10 transition-colors",
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
                <ScrollArea className="max-h-[min(32vh,12rem)] w-full min-h-0 rounded-sm border border-border/60 pr-0.5">
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
    strictOutputDimensionInputs = false,
    parsedExportWidth,
    parsedExportHeight,
    effectiveExportWidth,
    effectiveExportHeight,
    exportPreviewReady,
    onOpenQualityPopout,
    limitCropZoomToNativeResolution,
    flowPhase,
    hidePlacementCard = false,
    frameSummary,
    exportSizeUsesAspectAndMaxWidth = false,
    onExportMaxWidthBlur,
    showResolvedReadout = false,
    resolvedUploadTarget = null,
    resolvedConstraintsReadout = null,
    sessionMaxFileSizeBytes = null,
    presetFileLimitBlocker = null,
    naturalSizeAdvisory = null,
    onDismissNaturalSizeAdvisory = () => {},
    onApplyNaturalSizeSuggestion = () => {},
    uploadPresetPickerVisible = false,
    uploadPresetPickerReadOnly = false,
    uploadPresetPickerValue,
    uploadPresetPickerOptions = [],
    onUploadPresetPickerChange,
    exportFormatLocked = false,
    avifPresetOverriddenByTowerLimit = false,
    showExportSizeControls = false,
    positionPageTarget = null,
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

  const resolvedPlacement = useMemo(
    () =>
      resolveImageEditorPlacement({
        placement,
        offerSelectionPlacement,
        offerReplacePlacement,
        guestCmsTemplateRestricted,
      }),
    [placement, offerSelectionPlacement, offerReplacePlacement, guestCmsTemplateRestricted]
  );

  useLayoutEffect(() => {
    if (resolvedPlacement !== placement) {
      setPlacement(resolvedPlacement);
    }
  }, [resolvedPlacement, placement, setPlacement]);

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

  if (flowPhase === "position") {
    return (
      <div className={cn(beaconPanelContainClass, "flex flex-col gap-3")}>
        {positionPageTarget ? <ImagePageTargetSurfaceSummary target={positionPageTarget} /> : null}
        {uploadPresetPickerVisible ? (
          <UploadPresetPickerCard
            uploadPresetPickerValue={uploadPresetPickerValue}
            onUploadPresetPickerChange={onUploadPresetPickerChange}
            uploadPresetPickerReadOnly={uploadPresetPickerReadOnly}
            uploadPresetPickerOptions={uploadPresetPickerOptions}
            showAvifLimitNotice={avifPresetOverriddenByTowerLimit}
          />
        ) : null}
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
          exportSizeUsesAspectAndMaxWidth={exportSizeUsesAspectAndMaxWidth}
          onExportMaxWidthBlur={onExportMaxWidthBlur}
          strictOutputDimensionInputs={strictOutputDimensionInputs}
          showExportSizeControls={showExportSizeControls}
          naturalSizeAdvisory={naturalSizeAdvisory}
          onDismissNaturalSizeAdvisory={onDismissNaturalSizeAdvisory}
          onApplyNaturalSizeSuggestion={onApplyNaturalSizeSuggestion}
        />
      </div>
    );
  }

  return (
    <div className={cn(beaconPanelContainClass, "flex flex-col gap-3")}>
      {uploadPresetPickerVisible ? (
        <UploadPresetPickerCard
          uploadPresetPickerValue={uploadPresetPickerValue}
          onUploadPresetPickerChange={onUploadPresetPickerChange}
          uploadPresetPickerReadOnly={uploadPresetPickerReadOnly}
          uploadPresetPickerOptions={uploadPresetPickerOptions}
          showAvifLimitNotice={false}
        />
      ) : null}
      {showExportSizeControls ? (
        <Card size="sm">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-medium">Export size</CardTitle>
            <CardDescription className="text-xs leading-snug">
              Set aspect ratio and output dimensions for this upload.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <CropShapeControlsSection
              baseId={baseId}
              belowCropEntered
              exportSizeUsesAspectAndMaxWidth={exportSizeUsesAspectAndMaxWidth}
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
              onExportMaxWidthBlur={onExportMaxWidthBlur}
              strictOutputDimensionInputs={strictOutputDimensionInputs}
            />
          </CardContent>
        </Card>
      ) : null}
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
        exportPreviewReady={exportPreviewReady}
        onOpenQualityPopout={onOpenQualityPopout}
        presetFileLimitBlocker={presetFileLimitBlocker}
        exportFormatLocked={exportFormatLocked}
        avifPresetOverriddenByTowerLimit={avifPresetOverriddenByTowerLimit}
      />

      {showResolvedReadout ? (
        <ResolvedConstraintsReadOnlyCard
          target={resolvedUploadTarget}
          readout={resolvedConstraintsReadout}
          sessionMaxFileSizeBytes={sessionMaxFileSizeBytes}
        />
      ) : null}

      {hidePlacementCard ? null : (
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
      )}

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
    </div>
  );
}
