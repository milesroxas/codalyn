/** @vitest-environment jsdom */

import { BEACON_IMAGE_ERROR_CODES } from "@codalyn/webflow-kit";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyCroppedImageToWebflow, downloadCroppedImageWebp } from "@/features/image-editor/lib/apply-cropped-export";
import type { AssetFolderRow } from "@/features/image-editor/lib/asset-folder-row";

import { useApplyCroppedToWebflow } from "./use-apply-cropped-to-webflow";

vi.mock("@/features/image-editor/lib/apply-cropped-export", () => ({
  applyCroppedImageToWebflow: vi.fn().mockResolvedValue({ kind: "success", message: "ok" }),
  downloadCroppedImageWebp: vi.fn().mockResolvedValue({ kind: "success", message: "done" }),
}));

const crop = { x: 0, y: 0, width: 50, height: 50, unit: "px" as const };

function folderRow(id: string, handle: object): AssetFolderRow {
  return {
    id,
    name: id,
    parentId: null,
    pathLabel: id,
    handle: handle as AssetFolderRow["handle"],
  };
}

describe("useApplyCroppedToWebflow", () => {
  const setters = {
    setFileBaseName: vi.fn(),
    setOutputWidth: vi.fn(),
    setOutputHeight: vi.fn(),
    setWidthStr: vi.fn(),
    setHeightStr: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(applyCroppedImageToWebflow).mockClear();
    vi.mocked(downloadCroppedImageWebp).mockClear();
    vi.stubGlobal("webflow", {
      notify: vi.fn(),
    });
  });

  function options(override: Record<string, unknown> = {}) {
    return {
      imageSrc: "blob:img",
      completedCrop: crop,
      effectiveOutputW: 400,
      effectiveOutputH: 300,
      quality: 0.85,
      exportFormat: "webp" as const,
      avifTowerConsentGranted: false,
      fileBaseName: "export-name",
      altText: "A descriptive alt text",
      ...setters,
      componentImageProps: [],
      selectedComponentImagePropId: null,
      currentCmsItemId: null,
      assetFolders: [folderRow("f1", { id: "hf" })],
      selectedAssetFolderId: "f1",
      placement: "library" as const,
      replaceLibraryAsset: false,
      cmsPrimaryUpload: false,
      exportPlaceBlockedLabel: null,
      exportPlaceBlockedCode: null,
      ...override,
    };
  }

  it("blocks apply when preset guard is active", async () => {
    const { result } = renderHook(() =>
      useApplyCroppedToWebflow(
        options({
          exportPlaceBlockedLabel: "Over preset file limit",
          exportPlaceBlockedCode: BEACON_IMAGE_ERROR_CODES.EXPORT_PRESET_FILE_LIMIT_EXCEEDED,
        }) as Parameters<typeof useApplyCroppedToWebflow>[0]
      )
    );
    await act(async () => {
      await result.current.applyToCanvas();
    });
    const wf = (globalThis as unknown as { webflow: { notify: ReturnType<typeof vi.fn> } }).webflow;
    expect(wf.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: "Error", message: "Over preset file limit" })
    );
    expect(downloadCroppedImageWebp).not.toHaveBeenCalled();
    expect(applyCroppedImageToWebflow).not.toHaveBeenCalled();
  });

  it("calls applyCroppedImageToWebflow for library placement with resolved folder", async () => {
    const { result } = renderHook(() =>
      useApplyCroppedToWebflow(options({ placement: "library" }) as Parameters<typeof useApplyCroppedToWebflow>[0])
    );
    await act(async () => {
      await result.current.applyToCanvas();
    });
    expect(applyCroppedImageToWebflow).toHaveBeenCalled();
    const arg = vi.mocked(applyCroppedImageToWebflow).mock.calls[0][0];
    expect(arg.placement).toBe("library");
    expect(arg.targetFolder).toBeDefined();
    expect(arg.altText).toBe("A descriptive alt text");
  });

  it("warns when no asset folder is available for Webflow placement", async () => {
    const { result } = renderHook(() =>
      useApplyCroppedToWebflow(
        options({
          assetFolders: [],
          selectedAssetFolderId: null,
          cmsPrimaryUpload: false,
        }) as Parameters<typeof useApplyCroppedToWebflow>[0]
      )
    );
    await act(async () => {
      await result.current.applyToCanvas();
    });
    const wf = (globalThis as unknown as { webflow: { notify: ReturnType<typeof vi.fn> } }).webflow;
    expect(wf.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: "Warning", message: expect.stringContaining("folder") })
    );
    expect(applyCroppedImageToWebflow).not.toHaveBeenCalled();
  });

  it("allows null target folder for CMS primary upload when the library has no folders", async () => {
    const { result } = renderHook(() =>
      useApplyCroppedToWebflow(
        options({
          assetFolders: [],
          selectedAssetFolderId: null,
          placement: "selection",
          cmsPrimaryUpload: true,
          currentCmsItemId: "item-1",
        }) as Parameters<typeof useApplyCroppedToWebflow>[0]
      )
    );
    await act(async () => {
      await result.current.applyToCanvas();
    });
    expect(applyCroppedImageToWebflow).toHaveBeenCalled();
    const arg = vi.mocked(applyCroppedImageToWebflow).mock.calls[0][0];
    expect(arg.targetFolder).toBeNull();
  });

  it("sets exportSuccess on successful library placement", async () => {
    vi.mocked(applyCroppedImageToWebflow).mockResolvedValueOnce({
      kind: "success",
      message: "Saved to Assets.",
    });
    const { result } = renderHook(() =>
      useApplyCroppedToWebflow(options({ placement: "library" }) as Parameters<typeof useApplyCroppedToWebflow>[0])
    );
    await act(async () => {
      await result.current.applyToCanvas();
    });
    expect(result.current.exportSuccess).toEqual({
      message: "Saved to Assets.",
      cmsFieldUpdated: false,
    });
    const wf = (globalThis as unknown as { webflow: { notify: ReturnType<typeof vi.fn> } }).webflow;
    expect(wf.notify).not.toHaveBeenCalled();
  });

  it("marks cmsFieldUpdated when CMS field upload succeeds", async () => {
    vi.mocked(applyCroppedImageToWebflow).mockResolvedValueOnce({
      kind: "success",
      message: "Updated CMS field.",
      cmsFieldUpdated: true,
    });
    const { result } = renderHook(() =>
      useApplyCroppedToWebflow(
        options({
          placement: "selection",
          cmsPrimaryUpload: true,
          currentCmsItemId: "item-1",
        }) as Parameters<typeof useApplyCroppedToWebflow>[0]
      )
    );
    await act(async () => {
      await result.current.applyToCanvas();
    });
    expect(result.current.exportSuccess?.cmsFieldUpdated).toBe(true);
  });
});
