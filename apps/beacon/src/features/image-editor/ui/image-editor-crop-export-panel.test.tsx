/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/shared/ui/tooltip";
import type { ImageEditorCropExportPanelProps } from "./image-editor-crop-export-panel";
import { ImageEditorCropExportPanel } from "./image-editor-crop-export-panel";

vi.mock("react-easy-crop", () => ({
  default: () => <div data-testid="cropper" />,
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

function baseProps(overrides: Partial<ImageEditorCropExportPanelProps> = {}): ImageEditorCropExportPanelProps {
  return {
    baseId: "image-editor-test",
    imageSrc: "blob:source",
    cropAspect: 1,
    crop: { x: 0, y: 0 },
    setCrop: vi.fn(),
    zoom: 1,
    setZoom: vi.fn(),
    onCropComplete: vi.fn(),
    cropFrameMode: "custom",
    setCropFrameMode: vi.fn(),
    aspectPreset: "free",
    setAspectPreset: vi.fn(),
    visibleBuiltinAspectPresets: ["free", "1"],
    widthStr: "1200",
    setWidthStr: vi.fn(),
    outputWidth: 1200,
    setOutputWidth: vi.fn(),
    heightStr: "800",
    setHeightStr: vi.fn(),
    outputHeight: 800,
    setOutputHeight: vi.fn(),
    fileBaseName: "edited",
    setFileBaseName: vi.fn(),
    quality: 0.75,
    setQuality: vi.fn(),
    onQualityCommit: vi.fn(),
    exportFormat: "webp",
    allowAvifEncoding: false,
    setExportFormat: vi.fn(),
    onExportFormatCommit: vi.fn(),
    completedCrop: null,
    estimatePending: false,
    estimatedBytes: null,
    originalBytes: null,
    estimateNonce: 0,
    originalPreviewUrl: null,
    compressedPreviewUrl: null,
    previewPending: false,
    assetFolders: [],
    foldersLoading: false,
    folderActionBusy: false,
    selectedAssetFolderId: null,
    setSelectedAssetFolderId: vi.fn(),
    onCreateAssetFolder: vi.fn().mockResolvedValue(true),
    placement: "library",
    setPlacement: vi.fn(),
    replaceLibraryAsset: false,
    setReplaceLibraryAsset: vi.fn(),
    componentImageProps: [],
    selectedComponentImagePropId: null,
    setSelectedComponentImagePropId: vi.fn(),
    selectedElementType: "Image",
    componentImagePropsResolving: false,
    cmsPrimaryUpload: false,
    elementCmsBindingLoading: false,
    elementCmsBinding: "none",
    guestCmsTemplateRestricted: false,
    busy: false,
    strictOutputDimensionInputs: true,
    parsedExportWidth: 1200,
    parsedExportHeight: 800,
    effectiveExportWidth: 1200,
    effectiveExportHeight: 800,
    exportPreviewReady: true,
    onOpenQualityPopout: vi.fn(),
    limitCropZoomToNativeResolution: false,
    flowPhase: "position",
    frameSummary: "1:1 · 1200×800",
    ...overrides,
  };
}

describe("ImageEditorCropExportPanel advisory sizing UI", () => {
  it("allows dismissing advisory", () => {
    const onDismissNaturalSizeAdvisory = vi.fn();
    render(
      <ImageEditorCropExportPanel
        {...baseProps({
          naturalSizeAdvisory: {
            natural: { width: 3000, height: 2000 },
            comparison: { width: 1200, height: 800 },
            comparisonKind: "source-larger",
            canApplySuggestion: false,
            suggestedSessionWidth: 3000,
            suggestedSessionHeight: 2000,
          },
          onDismissNaturalSizeAdvisory,
        })}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismissNaturalSizeAdvisory).toHaveBeenCalledTimes(1);
  });

  it("allows applying suggested dimensions when action is available", () => {
    const onApplyNaturalSizeSuggestion = vi.fn();
    render(
      <ImageEditorCropExportPanel
        {...baseProps({
          naturalSizeAdvisory: {
            natural: { width: 600, height: 400 },
            comparison: { width: 1200, height: 800 },
            comparisonKind: "source-smaller",
            canApplySuggestion: true,
            suggestedSessionWidth: 600,
            suggestedSessionHeight: 400,
          },
          onApplyNaturalSizeSuggestion,
        })}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Use source size" }));
    expect(onApplyNaturalSizeSuggestion).toHaveBeenCalledTimes(1);
  });
});

describe("ImageEditorCropExportPanel upload preset picker", () => {
  it("renders picker when enabled", () => {
    const onUploadPresetPickerChange = vi.fn();
    render(
      <ImageEditorCropExportPanel
        {...baseProps({
          flowPhase: "position",
          uploadPresetPickerVisible: true,
          uploadPresetPickerValue: "manual-override",
          uploadPresetPickerOptions: [
            { id: "preset:preset-instance", label: "Instance" },
            { id: "manual-override", label: "Manual override" },
          ],
          onUploadPresetPickerChange,
        })}
      />
    );
    expect(screen.getByText("Upload preset")).toBeInTheDocument();
    expect(onUploadPresetPickerChange).not.toHaveBeenCalled();
  });

  it("disables picker in read-only mode", () => {
    render(
      <ImageEditorCropExportPanel
        {...baseProps({
          flowPhase: "position",
          uploadPresetPickerVisible: true,
          uploadPresetPickerReadOnly: true,
          uploadPresetPickerValue: "manual-override",
          uploadPresetPickerOptions: [{ id: "manual-override", label: "Manual override" }],
        })}
      />
    );
    expect(screen.getAllByRole("combobox")[0]).toBeDisabled();
  });
});

describe("ImageEditorCropExportPanel export size controls", () => {
  it("shows crop shape controls on position when manual override is active", () => {
    render(
      <TooltipProvider>
        <ImageEditorCropExportPanel
          {...baseProps({
            flowPhase: "position",
            showExportSizeControls: true,
          })}
        />
      </TooltipProvider>
    );
    expect(screen.getByText("Crop shape")).toBeInTheDocument();
  });

  it("shows crop shape controls on position when picker is hidden and manual sizing is required", () => {
    render(
      <TooltipProvider>
        <ImageEditorCropExportPanel
          {...baseProps({
            flowPhase: "position",
            uploadPresetPickerVisible: false,
            showExportSizeControls: true,
          })}
        />
      </TooltipProvider>
    );
    expect(screen.getByText("Crop shape")).toBeInTheDocument();
  });

  it("hides crop shape controls on position when a preset is active", () => {
    render(
      <ImageEditorCropExportPanel
        {...baseProps({
          flowPhase: "position",
          showExportSizeControls: false,
        })}
      />
    );
    expect(screen.queryByText("Crop shape")).not.toBeInTheDocument();
  });

  it("shows export size card on save when manual override is active", () => {
    render(
      <TooltipProvider>
        <ImageEditorCropExportPanel
          {...baseProps({
            flowPhase: "save",
            hidePlacementCard: true,
            placement: "download",
            showExportSizeControls: true,
          })}
        />
      </TooltipProvider>
    );
    expect(screen.getByText("Export size")).toBeInTheDocument();
    expect(screen.getByText("Crop shape")).toBeInTheDocument();
  });
});

describe("ImageEditorCropExportPanel export format lock", () => {
  function renderSavePanel(overrides: Partial<ImageEditorCropExportPanelProps> = {}) {
    return render(
      <TooltipProvider>
        <ImageEditorCropExportPanel
          {...baseProps({
            flowPhase: "save",
            hidePlacementCard: true,
            placement: "download",
            ...overrides,
          })}
        />
      </TooltipProvider>
    );
  }

  it("hides file type controls when export format is locked by preset", () => {
    renderSavePanel({ exportFormatLocked: true, allowAvifEncoding: false });
    expect(screen.queryByText("File type")).not.toBeInTheDocument();
  });

  it("shows file type controls when export format is not locked", () => {
    renderSavePanel({ exportFormatLocked: false, allowAvifEncoding: false });
    expect(screen.getByText("File type")).toBeInTheDocument();
  });
});
